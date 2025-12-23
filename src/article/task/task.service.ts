import { Inject, Injectable, Logger, MessageEvent } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import { Observable } from 'rxjs'
import { RedisClient } from 'bun'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { v7 as uuidv7 } from 'uuid'
import { BunRedisClient, GEMINI_TASK_QUEUE } from './task.constants'
import { CachedTask, GeminiTask } from './task.type'
import { Upload } from '../../upload/upload.entity'
import { GeminiTaskCreateDto } from './dto/gemini-task-create.dto'

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(
    @Inject(BunRedisClient) private readonly redisClient: RedisClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectQueue(GEMINI_TASK_QUEUE)
    private readonly geminiTaskQueue: Queue<GeminiTask>
  ) {}

  async createGeminiTask(body: GeminiTaskCreateDto, userId: string): Promise<string> {
    const taskId = uuidv7()
    await this.geminiTaskQueue.add(
      'generate',
      { ...body, userId },
      {
        jobId: taskId,
        removeOnComplete: true
      }
    )

    const cacheKey = `gemini-task:${taskId}`
    await this.cacheManager.set(cacheKey, {
      isDone: false,
      text: null,
      upload: null
    })

    return taskId
  }

  streamGeminiTask(taskId: string): Observable<MessageEvent> {
    return new Observable((observer) => {
      let subscriber: RedisClient | null = null
      let disposed = false
      const cacheKey = `gemini-task:${taskId}`
      const textChannel = `${cacheKey}:text`
      const imageChannel = `${cacheKey}:image`
      const doneChannel = `${cacheKey}:done`
      const errorChannel = `${cacheKey}:error`
      const channels = [textChannel, imageChannel, doneChannel, errorChannel]

      const stop = async (shouldComplete = true) => {
        if (disposed) {
          return
        }
        disposed = true
        if (subscriber) {
          try {
            await subscriber.unsubscribe(channels)
          } catch (error) {
            const err = error as Error
            this.logger.warn(`Failed to unsubscribe task channels: ${err.message}`)
          }
          try {
            subscriber.close()
          } catch (error) {
            const err = error as Error
            this.logger.warn(`Failed to close redis subscriber: ${err.message}`)
          }
          subscriber = null
        }
        if (shouldComplete) {
          observer.complete()
        }
      }

      const emitDoneAndStop = async () => {
        try {
          const latest = (await this.cacheManager.get<CachedTask>(cacheKey)) || null
          const donePayload: { text?: string; upload?: Upload } = {}
          if (latest?.text) {
            donePayload.text = latest.text
          }
          if (latest?.upload) {
            donePayload.upload = latest.upload
          }
          observer.next({ type: 'done', data: donePayload })
          await stop()
        } catch (error) {
          const err = error as Error
          this.logger.error(`Failed to emit done event: ${err.message}`, err.stack)
          await stop()
        }
      }

      const listener: RedisClient.StringPubSubListener = (payload, channel) => {
        void (async () => {
          if (disposed) {
            return
          }
          try {
            if (channel === doneChannel) {
              await emitDoneAndStop()
              return
            }
            if (channel === errorChannel) {
              let errorMessage = 'Generation failed.'
              try {
                const errorData = JSON.parse(payload)
                if (typeof errorData?.message === 'string') {
                  errorMessage = errorData.message
                } else if (typeof payload === 'string' && payload) {
                  errorMessage = payload
                }
              } catch {
                if (typeof payload === 'string' && payload) {
                  errorMessage = payload
                }
              }
              observer.next({ 
                type: 'error', 
                data: { message: errorMessage } 
              })
              await stop(false)
              return
            }
            if (channel === textChannel) {
              if (typeof payload === 'string' && payload) {
                observer.next({ 
                  type: 'text', 
                  data: { text: payload } 
                })
              }
              return
            }
            if (channel === imageChannel) {
              const upload = this.parseUploadPayload(payload)
              if (upload) {
                observer.next({ 
                  type: 'image', 
                  data: upload 
                })
              }
              return
            }
          } catch (error) {
            const err = error as Error
            this.logger.error(`Failed to process task message: ${err.message}`, err.stack)
            observer.next({ 
              type: 'error', 
              data: { message: err.message || 'Generation failed.' } 
            })
            await stop(false)
          }
        })()
      }

      ;(async () => {
        try {
          const cachedState = (await this.cacheManager.get<CachedTask>(cacheKey)) || null
          if (cachedState?.isDone) {
            await emitDoneAndStop()
            return
          }

          subscriber = await this.redisClient.duplicate()
          await subscriber.subscribe(channels, listener)
        } catch (error) {
          const err = error as Error
          this.logger.error(`Failed to subscribe task channels: ${err.message}`, err.stack)
          observer.next({ 
            type: 'error', 
            data: { message: err.message || 'Failed to subscribe to task updates.' } 
          })
          await stop(false)
        }
      })()

      return () => {
        void stop(false)
      }
    })
  }

  private parseUploadPayload(raw: string): Upload | null {
    if (!raw) {
      return null
    }
    try {
      const initial = JSON.parse(raw)
      if (typeof initial === 'string') {
        return JSON.parse(initial) as Upload
      }
      return initial as Upload
    } catch (error) {
      const err = error as Error
      this.logger.warn(`Failed to parse upload payload: ${err.message}`)
      return null
    }
  }
}
