import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { CachedTask, GeminiTask, InlineContent } from './task.type'
import { Inject } from '@nestjs/common'
import { GoogleGenAI } from '@google/genai'
import { UploadService } from '../../upload/upload.service'
import { Upload } from '../../upload/upload.entity'
import { BunRedisClient, GEMINI_TASK_QUEUE, GoogleGenAIClient } from './task.constants'
import { RedisClient } from 'bun'
import { type Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { isEqual } from 'lodash'

@Processor(GEMINI_TASK_QUEUE)
export class TaskGeminiProcessor extends WorkerHost {
  @Inject(GoogleGenAIClient)
  private readonly ai: GoogleGenAI

  @Inject(BunRedisClient)
  private readonly redis: RedisClient

  @Inject(UploadService)
  private readonly uploadService: UploadService

  @Inject(CACHE_MANAGER) private readonly cacheManager: Cache

  async process(job: Job<GeminiTask>): Promise<void> {
    const { aspectRatio, imageSize, referenceUploadIds, prompt, userId } = job.data
    const cacheKey = `gemini-task:${job.id}`
    const textChannel = `${cacheKey}:text`
    const imageChannel = `${cacheKey}:image`
    const doneChannel = `${cacheKey}:done`

    let currentState: CachedTask = (await this.cacheManager.get<CachedTask>(cacheKey)) ?? {
      isDone: false,
      text: null,
      upload: null
    }
    await this.cacheManager.set(cacheKey, currentState)

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

    let aggregatedText = currentState.text ?? ''
    let lastUpload: Upload | null = currentState.upload ?? null

    for await (const chunk of stream) {
      const candidates = chunk.candidates ?? []

      for (const candidate of candidates) {
        const parts = candidate.content?.parts ?? []
        for (const part of parts) {
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
          }
        }
      }
    }

    const finalTask: CachedTask = {
      isDone: true,
      text: aggregatedText || null,
      upload: lastUpload
    }
    await persistState(finalTask)
    await this.redis.publish(doneChannel, 'done')
  }
}
