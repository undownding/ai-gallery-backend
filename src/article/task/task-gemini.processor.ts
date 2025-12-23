import {Processor, WorkerHost} from '@nestjs/bullmq'
import {Job} from 'bullmq'
import {CachedTask, GeminiTask, InlineContent} from './task.type'
import {Inject, Logger} from '@nestjs/common'
import {GoogleGenAI} from '@google/genai'
import {UploadService} from '../../upload/upload.service'
import {Upload} from '../../upload/upload.entity'
import {BunRedisClient, GEMINI_TASK_QUEUE, GoogleGenAIClient} from './task.constants'
import {RedisClient} from 'bun'
import {type Cache, CACHE_MANAGER} from '@nestjs/cache-manager'
import {isEqual} from 'lodash'
import {ConfigService} from "@nestjs/config"

@Processor(GEMINI_TASK_QUEUE)
export class TaskGeminiProcessor extends WorkerHost {
  @Inject(GoogleGenAIClient)
  private readonly ai: GoogleGenAI

  @Inject(BunRedisClient)
  private readonly redis: RedisClient

  @Inject(UploadService)
  private readonly uploadService: UploadService

  @Inject(CACHE_MANAGER) private readonly cacheManager: Cache

  @Inject(ConfigService)
  private readonly configService: ConfigService

  private readonly logger = new Logger(TaskGeminiProcessor.name)

  async process(job: Job<GeminiTask>): Promise<void> {
    const cacheKey = `gemini-task:${job.id}`
    const textChannel = `${cacheKey}:text`
    const imageChannel = `${cacheKey}:image`
    const doneChannel = `${cacheKey}:done`
    const errorChannel = `${cacheKey}:error`

    const emitError = async (error: Error | unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error) || 'Generation failed.'
      const errorPayload = JSON.stringify({ message: errorMessage })
      try {
        await this.redis.set(errorChannel, errorPayload)
        await this.redis.publish(errorChannel, errorPayload)
        this.logger.error(`Job ${job.id}: error emitted - ${errorMessage}`)
      } catch (publishError) {
        const err = publishError as Error
        this.logger.error(`Job ${job.id}: failed to publish error: ${err.message}`)
      }
    }

    try {
      this.logger.debug(`Gemini API Base URL: ${this.configService.get('AI_GATEWAY_GEMINI')}`)
      this.logger.debug(`Gemini API Key: ${this.configService.get('GEMINI_API_KEY')}`)
      this.logger.debug(`AI Gateway Token: ${this.configService.get('AI_GATEWAY_TOKEN')}`)
      const { aspectRatio, imageSize, referenceUploadIds, prompt, userId } = job.data

      this.logger.debug(`Job ${job.id}: starting Gemini task for user ${userId}`)

      let currentState: CachedTask = (await this.cacheManager.get<CachedTask>(cacheKey)) ?? {
        isDone: false,
        text: null,
        upload: null
      }
      await this.cacheManager.set(cacheKey, currentState)
      this.logger.debug(`Job ${job.id}: initialized cache state`)

      const persistState = async (next: CachedTask) => {
        if (!isEqual(currentState, next)) {
          await this.cacheManager.set(cacheKey, next)
          currentState = next
        }
      }

      const referenceContents: InlineContent[] = (
        await Promise.all(
          (referenceUploadIds || [])
            .filter(Boolean)
            .map(async (id) => await this.uploadService.getBase64Object(id))
        )
      )
        .filter(Boolean)
        .map((inlineData: { mimeType: string; data: string }) => ({
          inlineData
        }))
      this.logger.debug(`Job ${job.id}: prepared ${referenceContents.length} reference contents`)
      const contents: InlineContent[] = [{ text: prompt }, ...referenceContents]
      
      const stream = await this.ai.models.generateContentStream({
        model: 'gemini-3-pro-image-preview',
        contents,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          thinkingConfig: {
            includeThoughts: true
          },
          imageConfig: {
            aspectRatio,
            imageSize
          }
        }
      })
      this.logger.debug(
        `Job ${job.id}: content stream opened (aspectRatio=${aspectRatio ?? 'auto'}, imageSize=${
          imageSize ?? 'default'
        })`
      )

      let aggregatedText = currentState.text ?? ''
      let lastUpload: Upload | null = currentState.upload ?? null

      try {
        for await (const chunk of stream) {
          const candidates = chunk.candidates ?? []

          for (const candidate of candidates) {
            const parts = candidate.content?.parts ?? []
            for (const part of parts) {
              try {
                const text = (part as { text?: string }).text
                if (text) {
                  aggregatedText = aggregatedText ? `${aggregatedText}${text}` : text
                  await this.redis.set(textChannel, aggregatedText)
                  await this.redis.publish(textChannel, aggregatedText)
                  await persistState({
                    isDone: false,
                    text: aggregatedText || null,
                    upload: lastUpload
                  })
                  this.logger.debug(
                    `Job ${job.id}: received text chunk (chunkLen=${text.length}, totalLen=${aggregatedText.length})`
                  )
                  continue
                }

                const inlineData = (part as { inlineData?: { data?: string; mimeType?: string } })
                  .inlineData
                if (inlineData?.data) {
                  lastUpload = await this.uploadService.uploadBase64Image(
                    inlineData.data,
                    inlineData.mimeType,
                    { id: userId }
                  )
                  const uploadPayload = JSON.stringify(lastUpload)
                  await this.redis.set(imageChannel, uploadPayload)
                  await this.redis.publish(imageChannel, uploadPayload)
                  await persistState({
                    isDone: false,
                    text: aggregatedText || null,
                    upload: lastUpload
                  })
                  this.logger.debug(
                    `Job ${job.id}: generated image upload ${lastUpload?.id ?? 'unknown'}`
                  )
                }
              } catch (chunkError) {
                this.logger.error(`Job ${job.id}: error processing chunk: ${chunkError}`, chunkError instanceof Error ? chunkError.stack : undefined)
                await emitError(chunkError)
                throw chunkError
              }
            }
          }
        }
      } catch (streamError) {
        this.logger.error(`Job ${job.id}: error in stream processing: ${streamError}`, streamError instanceof Error ? streamError.stack : undefined)
        await emitError(streamError)
        throw streamError
      }

      const finalTask: CachedTask = {
        isDone: true,
        text: aggregatedText || null,
        upload: lastUpload
      }
      await persistState(finalTask)
      await this.redis.publish(doneChannel, 'done')
      this.logger.debug(
        `Job ${job.id}: completed (hasText=${Boolean(aggregatedText)}, hasImage=${Boolean(lastUpload)})`
      )
    } catch (error) {
      this.logger.error(`Job ${job.id}: task failed: ${error}`, error instanceof Error ? error.stack : undefined)
      await emitError(error)
      throw error
    }
  }
}
