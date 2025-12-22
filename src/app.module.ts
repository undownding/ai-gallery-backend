import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UserModule } from './user/user.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UploadModule } from './upload/upload.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { createTypeOrmAsyncOptions } from './common/typeorm/data-source'
import { JwtModule } from '@nestjs/jwt'
import { ArticleModule } from './article/article.module'
import { S3Module } from './s3/s3.module'
import { BullModule } from '@nestjs/bullmq'
import { parseRedisUrl } from './common/redis-url-parser'
import { createAppCacheModule } from './common/cache/app-cache-module'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'badapple'),
        signOptions: { expiresIn: '7d' }
      })
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    createAppCacheModule(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: parseRedisUrl(
          configService.get('REDIS_URL', 'REDIS_URL=redis://localhost:6379/4'),
          false
        )[0]
      })
    }),
    TypeOrmModule.forRootAsync(createTypeOrmAsyncOptions()),
    UserModule,
    S3Module,
    UploadModule,
    ArticleModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
