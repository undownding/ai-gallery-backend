import {Module} from '@nestjs/common'
import {S3Service} from './s3.service'
import {ConfigModule, ConfigService} from '@nestjs/config'
import {S3_BUCKET, S3_CLIENT} from './s3.constants'

@Module({
  imports: [ConfigModule],
  providers: [
    S3Service,
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Bun.S3Client({
          accessKeyId: configService.get<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: configService.get<string>('S3_SECRET_ACCESS_KEY'),
          region: configService.get<string>('S3_REGION'),
          endpoint: configService.get<string>('S3_ENDPOINT'),
          bucket: configService.get<string>('S3_BUCKET') || 'default-bucket'
        })
    },
    {
      provide: S3_BUCKET,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('S3_BUCKET') || 'default-bucket'
      }
    }
  ],
  exports: [S3_CLIENT, S3_BUCKET, S3Service]
})
export class S3Module {}
