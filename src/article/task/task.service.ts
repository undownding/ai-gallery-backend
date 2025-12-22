import { Inject, Injectable, Logger, MessageEvent } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import { Observable } from 'rxjs'
import { RedisClient } from 'bun'
import { BunRedisClient } from './task.constants'
import { CachedTask } from './task.type'
import { Upload } from '../../upload/upload.entity'

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(
    @Inject(BunRedisClient) private readonly redisClient: RedisClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  streamGeminiTask(taskId: string): Observable<MessageEvent> {
    return new Observable((observer) => {
      let subscriber: RedisClient | null = null
      let disposed = false
      let pollTimer: NodeJS.Timeout | null = null
      const cacheKey = `gemini-task:${taskId}`
      const channels = [`${cacheKey}:text`, `${cacheKey}:image`]

      const emptyState = (): CachedTask => ({
        isDone: false,
        text: null,
        upload: null
      })

      const emitState = (state: CachedTask | null, type: string = 'task-state') => {
        observer.next({ type, data: state ?? emptyState() })
      }

      const stop = async (shouldComplete = true) => {
        if (disposed) {
          return
        }
        disposed = true
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
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

      const checkDone = async (): Promise<boolean> => {
        if (disposed) {
          return true
        }
        try {
          const latest = await this.cacheManager.get<CachedTask>(cacheKey)
          if (latest?.isDone) {
            emitState(latest)
            await stop()
            return true
          }
        } catch (error) {
          const err = error as Error
          this.logger.error(`Failed to check task state: ${err.message}`, err.stack)
        }
        return false
      }

      const listener: RedisClient.StringPubSubListener = (payload, channel) => {
        void (async () => {
          if (disposed) {
            return
          }
          try {
            if (channel.endsWith(':text')) {
              observer.next({ type: 'task-text', data: { text: payload } })
            } else if (channel.endsWith(':image')) {
              const upload = this.parseUploadPayload(payload)
              if (upload) {
                observer.next({ type: 'task-image', data: upload })
              }
            }
            await checkDone()
          } catch (error) {
            const err = error as Error
            this.logger.error(`Failed to process task message: ${err.message}`, err.stack)
            await stop(false)
            observer.error(err)
          }
        })()
      }

      ;(async () => {
        try {
          const cachedState = (await this.cacheManager.get<CachedTask>(cacheKey)) || null
          emitState(cachedState)
          if (cachedState?.isDone) {
            await stop()
            return
          }

          subscriber = await this.redisClient.duplicate()
          await subscriber.subscribe(channels, listener)

          // Gemini processor only publishes partial updates, so poll cache for the final done flag.
          pollTimer = setInterval(() => {
            void checkDone()
          }, 2000)
        } catch (error) {
          const err = error as Error
          await stop(false)
          observer.error(err)
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
