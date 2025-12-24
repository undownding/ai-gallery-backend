import {Inject, Injectable, Logger} from '@nestjs/common'
import {Cron} from '@nestjs/schedule'
import {InjectDataSource} from '@nestjs/typeorm'
import {Brackets, DataSource} from 'typeorm'
import {S3_CLIENT} from '../s3/s3.constants'
import {Upload} from '../upload/upload.entity'
import dayjs from 'dayjs'

@Injectable()
export class CleanupOrphanUploadsService {
  private readonly logger = new Logger(CleanupOrphanUploadsService.name)

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(S3_CLIENT) private readonly s3Client: Bun.S3Client
  ) {}

  @Cron('0 5 * * *', {
    name: 'cleanup-orphan-uploads',
    timeZone: 'Asia/Shanghai'
  })
  async handleCron() {
    this.logger.log('开始清理孤儿 upload...')
    await this.cleanupOrphanUploads()
  }

  async cleanupOrphanUploads() {
    try {
      // 计算一天前的时间
      const oneDayAgo = dayjs().subtract(1, 'day').toDate()

      // 查询孤儿 upload：不在任何 article 关系中，且创建时间早于一天
      const orphanUploads = await this.dataSource
        .getRepository(Upload)
        .createQueryBuilder('upload')
        .leftJoin('article', 'article', 'article.thumbnailId = upload.id')
        .leftJoin('article_media_assets', 'ama', 'ama.uploadId = upload.id')
        .leftJoin('article_source_assets', 'asa', 'asa.uploadId = upload.id')
        .where('upload.createdAt < :oneDayAgo', { oneDayAgo })
        .andWhere(
          new Brackets((qb) => {
            qb.where('article.id IS NULL')
              .andWhere('ama.uploadId IS NULL')
              .andWhere('asa.uploadId IS NULL')
          })
        )
        .getMany()

      this.logger.log(`找到 ${orphanUploads.length} 个孤儿 upload`)

      let deletedCount = 0
      let errorCount = 0

      for (const upload of orphanUploads) {
        try {
          // 从 S3 删除文件
          if (upload.key) {
            try {
              await this.s3Client.delete(upload.key)
              this.logger.debug(`已从 S3 删除文件: ${upload.key}`)
            } catch (s3Error: any) {
              // 如果文件不存在，继续删除数据库记录
              if (s3Error.name !== 'NoSuchKey' && s3Error.name !== 'NotFound') {
                this.logger.warn(`删除 S3 文件失败 ${upload.key}: ${s3Error.message}`)
                // 继续尝试删除数据库记录
              }
            }
          }

          // 从数据库删除记录
          await this.dataSource.getRepository(Upload).delete(upload.id)
          deletedCount++
          this.logger.debug(`已删除 upload: ${upload.id}`)
        } catch (error: any) {
          errorCount++
          this.logger.error(`删除 upload ${upload.id} 失败: ${error.message}`)
        }
      }

      this.logger.log(`清理完成: 成功删除 ${deletedCount} 个，失败 ${errorCount} 个`)
    } catch (error: any) {
      this.logger.error(`清理孤儿 upload 时发生错误: ${error.message}`, error.stack)
    }
  }
}
