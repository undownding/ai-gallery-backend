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
      const doneChannel = `${cacheKey}:done`
      const channels = [`${cacheKey}:text`, `${cacheKey}:image`, doneChannel]

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

      const emitFinalStateAndStop = async () => {
        const latest = (await this.cacheManager.get<CachedTask>(cacheKey)) || null
        emitState(latest)
        await stop()
      }

      const listener: RedisClient.StringPubSubListener = (payload, channel) => {
        void (async () => {
          if (disposed) {
            return
          }
          try {
            if (channel === doneChannel) {
              await emitFinalStateAndStop()
              return
            }
            if (channel.endsWith(':text')) {
              observer.next({ type: 'task-text', data: { text: payload } })
            } else if (channel.endsWith(':image')) {
              const upload = this.parseUploadPayload(payload)
              if (upload) {
                observer.next({ type: 'task-image', data: upload })
              }
            }
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
          const cachedState = (await this.cacheManager.get<CachedTask>(cacheKey)) || emptyState()
          emitState(cachedState)
          if (cachedState?.isDone) {
            await stop()
            return
          }

          subscriber = await this.redisClient.duplicate()
          await subscriber.subscribe(channels, listener)
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
