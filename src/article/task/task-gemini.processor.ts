import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import { CachedTask, GeminiTask, InlineContent } from './task.type'
import { Inject } from '@nestjs/common'
import { GoogleGenAI } from '@google/genai'
import { UploadService } from '../../upload/upload.service'
import { Upload } from '../../upload/upload.entity'
import { BunRedisClient } from './task.constants'
import { RedisClient } from 'bun'
import { type Cache, CACHE_MANAGER } from '@nestjs/cache-manager'
import { isEqual } from 'lodash'

@Processor('gemini-task-queue')
export class TaskGeminiProcessor extends WorkerHost {
  @Inject(GoogleGenAI)
  private readonly ai: GoogleGenAI

  @Inject(BunRedisClient)
  private readonly redis: RedisClient

  @Inject(UploadService)
  private readonly uploadService: UploadService

  @Inject(CACHE_MANAGER) private readonly cacheManager: Cache

  async process(job: Job<GeminiTask>, token?: string): Promise<void> {
    const { aspectRatio, imageSize, referenceUploadIds, prompt, userId } = job.data
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

    let aggregatedText = ''
    let lastUpload: Upload | null = null

    for await (const chunk of stream) {
      const candidates = chunk.candidates ?? []

      for (const candidate of candidates) {
        const cachedTask: CachedTask = (await this.cacheManager.get(
          `gemini-task-cache:${job.id}`
        )) || {
          isDone: false,
          text: null,
          upload: null
        }

        const parts = candidate.content?.parts ?? []
        for (const part of parts) {
          const text = (part as { text?: string }).text
          if (text) {
            aggregatedText = aggregatedText ? `${aggregatedText}${text}` : text
            // sendEvent(controller, 'text', { text })
            await this.redis.set(`gemini-task:${job.id}:text`, aggregatedText)
            await this.redis.publish(`gemini-task:${job.id}:text`, aggregatedText)
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
            const lastUploadJson = JSON.stringify(lastUpload)
            await this.redis.set(`gemini-task:${job.id}:image`, JSON.stringify(lastUploadJson))
            await this.redis.publish(`gemini-task:${job.id}:image`, JSON.stringify(lastUploadJson))
            // sendEvent(controller, 'image', upload)
          }

          const nowTask = {
            isDone: false,
            text,
            upload: lastUpload
          }

          if (!isEqual(cachedTask, nowTask)) {
            await this.cacheManager.set(`gemini-task:${job.id}`, nowTask)
          }
        }
      }
    }

    const finalTask: CachedTask = {
      isDone: true,
      text: aggregatedText,
      upload: lastUpload
    }
    await this.cacheManager.set(`gemini-task:${job.id}`, finalTask)
  }
}
