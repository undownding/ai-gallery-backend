import {Inject, Injectable, Logger} from '@nestjs/common'
import sharp from 'sharp'
import dayjs from 'dayjs'
import {Upload} from './upload.entity'
import {v7 as uuidv7} from 'uuid'
import {isEmpty, isNull} from 'lodash'
import {URL} from 'url'
import {S3_BUCKET, S3_CLIENT} from '../s3/s3.constants'
import {BaseCrudService} from '../common/base-crud-service'

export type UploadOwner = {
  id?: string | null
  login?: string | null
}

const DEFAULT_OWNER_SEGMENT = 'anonymous'

function buildObjectKey(owner: UploadOwner | null | undefined, ext: string) {
  const normalizedExt = (ext || 'bin').replace(/^\.+/, '').trim().toLowerCase() || 'bin'
  const id = uuidv7()
  const prefix = dayjs().format('YYYY-MM')
  const ownerId = owner?.id?.trim() || DEFAULT_OWNER_SEGMENT
  const ownerLogin = owner?.login?.trim() || DEFAULT_OWNER_SEGMENT
  const ownerSegment = `${ownerLogin}_${ownerId}`
  return {
    id,
    key: `${prefix}/${ownerSegment}/${id}.${normalizedExt}`
  }
}

@Injectable()
export class UploadService extends BaseCrudService<Upload> {
  @Inject(S3_CLIENT) private readonly s3Client: Bun.S3Client
  @Inject(S3_BUCKET) private readonly bucketName: string
  @Inject('CDN_ADDR') private readonly CDN_ADDR: string

  constructor() {
    super(Upload)
  }

  async presign(ext: string, owner?: UploadOwner): Promise<Upload> {
    const { key } = buildObjectKey(owner, ext)

    const url = this.s3Client.presign(key, {
      method: 'PUT',
      expiresIn: 3600
    })

    const upload = await this.create({
      key,
      ...(owner?.id ? { user: { id: owner.id } } : {})
    })

    return {
      ...upload,
      url
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
        Logger.error(`S3 object with key ${upload.key} not found`, 'UploadService')
      }
    }
  }

  override async getById(id: string): Promise<Upload | null> {
    const data = await super.getById(id)
    if (data && (isEmpty(data.eTag) || isNull(data.size))) {
      try {
        await this.setETagFromS3(data)
      } catch (error) {
        Logger.error(`Failed to set ETag for upload ${data.id}: ${error.message}`, 'UploadService')
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

  async getBase64Object(uploadId: string): Promise<{ mimeType: string; data: string } | null> {
    const upload = await this.getById(uploadId)
    if (!upload) {
      return null
    }

    try {
      const s3File = this.s3Client.file(upload.key)
      const [stat, arrayBuffer] = await Promise.all([s3File.stat(), s3File.arrayBuffer()])
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      return {
        mimeType: stat?.type || 'application/octet-stream',
        data: base64
      }
    } catch (error) {
      Logger.error(
        `Failed to read S3 object for upload ${uploadId}: ${error.message}`,
        'UploadService'
      )
      return null
    }
  }

  async uploadBase64Image(
    base64Image: string,
    mimeType?: string,
    owner?: UploadOwner
  ): Promise<Upload | null> {
    if (!base64Image) {
      return null
    }

    let resolvedMimeType = mimeType || 'unknown mime'

    try {
      const dataUrlMatch = base64Image.match(/^data:(?<type>[^;]+);base64,/)
      const normalizedBase64 = dataUrlMatch
        ? base64Image.slice(dataUrlMatch[0].length)
        : base64Image
      resolvedMimeType = dataUrlMatch?.groups?.type || mimeType || 'application/octet-stream'
      if (
        resolvedMimeType !== 'application/octet-stream' &&
        !resolvedMimeType.startsWith('image/')
      ) {
        throw new Error(`Unsupported MIME type: ${resolvedMimeType}`)
      }
      const binary = Buffer.from(normalizedBase64.replace(/\s+/g, ''), 'base64')
      return this.uploadImageBuffer(binary, owner, { sourceMimeType: resolvedMimeType })
    } catch (error) {
      Logger.error(
        `Failed to upload base64 image (${resolvedMimeType}): ${error.message}`,
        'UploadService'
      )
      return null
    }
  }

  async uploadImageBuffer(
    buffer: Buffer,
    owner?: UploadOwner,
    options?: { sourceMimeType?: string }
  ): Promise<Upload | null> {
    if (!buffer || buffer.length === 0) {
      return null
    }

    try {
      const webpBuffer = await sharp(buffer).webp({ quality: 90 }).toBuffer()

      const { key } = buildObjectKey(owner, 'webp')

      await this.s3Client.write(key, webpBuffer, {
        type: 'image/webp',
        acl: 'public-read'
      })

      const upload = await this.create({
        key,
        ...(owner?.id ? { user: { id: owner.id } } : {})
      })
      await this.setETagFromS3(upload)

      if (!upload.url) {
        upload.url = `${this.CDN_ADDR}/${key}`
      }

      return upload
    } catch (error) {
      Logger.error(
        `Failed to upload image buffer (${options?.sourceMimeType || 'unknown mime'}): ${error.message}`,
        'UploadService'
      )
      return null
    }
  }

  async generateSquareThumbnailFromUpload(
    uploadId: string,
    owner?: UploadOwner,
    size = 500
  ): Promise<Upload | null> {
    const sourceUpload = await this.getById(uploadId)
    if (!sourceUpload?.key) {
      Logger.error(
        `Cannot generate thumbnail: upload ${uploadId} does not exist or is missing key`,
        'UploadService'
      )
      return null
    }

    try {
      const s3File = this.s3Client.file(sourceUpload.key)
      const arrayBuffer = await s3File.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const sharpImage = sharp(buffer)
      const { width, height } = await sharpImage.metadata()
      // Resize so the shortest edge equals the requested size while preserving aspect ratio
      const resizeOptions: sharp.ResizeOptions =
        typeof width === 'number' && typeof height === 'number'
          ? width <= height
            ? { width: size }
            : { height: size }
          : { width: size }

      const webpBuffer = await sharpImage.resize(resizeOptions).webp({ quality: 90 }).toBuffer()

      const { key } = buildObjectKey(owner, 'webp')

      await this.s3Client.write(key, webpBuffer, {
        type: 'image/webp',
        acl: 'public-read'
      })

      const thumbnail = await this.create({
        key,
        ...(owner?.id ? { user: { id: owner.id } } : {})
      })
      await this.setETagFromS3(thumbnail)

      if (!thumbnail.url) {
        thumbnail.url = `${this.CDN_ADDR}/${key}`
      }

      return thumbnail
    } catch (error) {
      Logger.error(
        `Failed to generate thumbnail from upload ${uploadId}: ${error.message}`,
        'UploadService'
      )
      return null
    }
  }
}
