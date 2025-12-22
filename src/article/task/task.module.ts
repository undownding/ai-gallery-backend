import { Module } from '@nestjs/common'
import { BunRedisClient, GoogleGenAIClient } from './task.constants'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleGenAI } from '@google/genai'
import { UploadModule } from '../../upload/upload.module'
import { RedisClient } from 'bun'
import { TaskController } from './task.controller'
import { TaskService } from './task.service'

@Module({
  imports: [ConfigModule, UploadModule],
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
    TaskService
  ],
  controllers: [TaskController]
})
export class TaskModule {}
