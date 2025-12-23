import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { BunRedisClient, GEMINI_TASK_QUEUE, GoogleGenAIClient } from './task.constants'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleGenAI } from '@google/genai'
import { UploadModule } from '../../upload/upload.module'
import { RedisClient } from 'bun'
import { TaskController } from './task.controller'
import { TaskService } from './task.service'
import { TaskGeminiProcessor } from './task-gemini.processor'

@Module({
  imports: [ConfigModule, UploadModule, BullModule.registerQueue({ name: GEMINI_TASK_QUEUE })],
  providers: [
    {
      provide: GoogleGenAIClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): GoogleGenAI =>
        new GoogleGenAI({
          apiKey: configService.get('GEMINI_API_KEY'),
          httpOptions: {
            baseUrl: configService.get('AI_GATEWAY_GEMINI'),
            headers: {
              Authorization: `Bearer ${configService.get('AI_GATEWAY_TOKEN')}`
            }
          }
        })
    },
    {
      provide: BunRedisClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new RedisClient(configService.get('REDIS_URL', 'redis://localhost:6379/4'))
    },
    TaskService,
    TaskGeminiProcessor
  ],
  controllers: [TaskController]
})
export class TaskModule {}
