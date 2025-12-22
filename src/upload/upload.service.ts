import { Inject, Injectable, Logger } from '@nestjs/common'
import { Upload } from './upload.entity'
import { v7 as uuid } from 'uuid'
import { isEmpty, isNull } from 'lodash'
import { URL } from 'url'
import { S3_BUCKET, S3_CLIENT } from '../s3/s3.constants'
import { BaseCrudService } from '../common/base-crud-service'

@Injectable()
export class UploadService extends BaseCrudService<Upload> {
  @Inject(S3_CLIENT) private readonly s3Client: Bun.S3Client
  @Inject(S3_BUCKET) private readonly bucketName: string
  @Inject('CDN_ADDR') private readonly CDN_ADDR: string

  constructor() {
    super(Upload)
  }

  async presign(ext: string, userId?: string): Promise<Upload> {
    const id = uuid()
    const key = `public/user-uploads/${userId || 'anonymous'}/${id}.${ext}`

    const url = this.s3Client.presign(key, {
      method: 'PUT',
      expiresIn: 3600,
    })

    const upload = await this.create({ key, user: { id: userId } })

    return {
      ...upload,
      url,
    }
  }

  async setETagFromS3(upload: Upload): Promise<void> {
    try {
      const stat = await this.s3Client.stat(upload.key)
      upload.eTag = stat.etag
      upload.size = stat.size
      upload.url = `${this.CDN_ADDR}/${upload.key}`
      await this.repository.save(upload)
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        Logger.error(
          `S3 object with key ${upload.key} not found`,
          'UploadService',
        )
      }
    }
  }

  override async getById(id: string): Promise<Upload | null> {
    const data = await super.getById(id)
    if (data && (isEmpty(data.eTag) || isNull(data.size))) {
      try {
        await this.setETagFromS3(data)
      } catch (error) {
        Logger.error(
          `Failed to set ETag for upload ${data.id}: ${error.message}`,
          'UploadService',
        )
      }
    }
    return data
  }

  async createFromUrl(url: string, userId: string): Promise<Upload | null> {
    try {
      const parsedUrl = new URL(url)
      const key = parsedUrl.pathname.slice(1)
      const upload = await this.create({ key, user: { id: userId } })
      await this.setETagFromS3(upload)
      return upload
    } catch (error) {
      console.error('Failed to create upload from S3 URL:', error)
      return null
    }
  }

  async createFromKey(key: string, userId: string): Promise<Upload | null> {
    try {
      const upload = await this.create({ key, user: { id: userId } })
      await this.setETagFromS3(upload)
      return upload
    } catch (error) {
      console.error('Failed to create upload from S3 key:', error)
      return null
    }
  }
}
