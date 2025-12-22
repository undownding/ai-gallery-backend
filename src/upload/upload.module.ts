import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UploadService } from './upload.service'
import { UploadController } from './upload.controller'
import { ConfigService } from '@nestjs/config'
import { Upload } from './upload.entity'
import { S3Module } from '../s3/s3.module'

@Module({
  imports: [TypeOrmModule.forFeature([Upload]), S3Module],
  providers: [
    UploadService,
    {
      provide: 'CDN_ADDR',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('CDN_ADDR') || 'https://cdn.example.com'
      }
    }
  ],
  exports: [UploadService],
  controllers: [UploadController]
})
export class UploadModule {}
