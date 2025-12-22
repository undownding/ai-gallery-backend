import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UserModule } from './user/user.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { S3Module } from './s3/s3.module'
import { UploadModule } from './upload/upload.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { createTypeOrmAsyncOptions } from './common/typeorm/data-source'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'badapple'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(createTypeOrmAsyncOptions()),
    UserModule,
    S3Module,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
