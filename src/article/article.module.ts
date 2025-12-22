import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Article } from './article.entity'
import { ArticleController } from './article.controller'
import { ArticleService } from './article.service'
import { UserModule } from '../user/user.module'
import { UploadModule } from '../upload/upload.module'
import { TaskModule } from './task/task.module'

@Module({
  imports: [UserModule, UploadModule, TaskModule, TypeOrmModule.forFeature([Article])],
  controllers: [ArticleController],
  providers: [ArticleService]
})
export class ArticleModule {}
