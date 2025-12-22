import { Inject, Injectable } from '@nestjs/common'
import { S3_CLIENT } from './s3.constants'
import { v7 as uuidv7 } from 'uuid'
import { PresignedUrlItemDTO } from './dto/s3.dto'

@Injectable()
export class S3Service {
  constructor(@Inject(S3_CLIENT) private readonly s3Client: Bun.S3Client) {}

  /**
   * 生成指定数量的 putObject presigned URLs
   * @param count 需要生成的 URL 数量
   * @param expiresIn URL 过期时间（秒），默认 3600 秒（1小时）
   * @returns 包含 id, presigned URLs 和对应 keys 的数组
   */
  async generatePutObjectPresignedUrls(
    count: number,
    expiresIn: number = 3600,
  ): Promise<PresignedUrlItemDTO[]> {
    const results: PresignedUrlItemDTO[] = []

    for (let i = 0; i < count; i++) {
      // 生成 UUID v7 作为文件标识符
      const id = uuidv7()
      // 生成完整的 S3 key
      const key = `public/${id}.png`

      // 生成 presigned URL
      const url = this.s3Client.presign(key, {
        method: 'PUT',
        expiresIn,
      })

      results.push({ id, key, url })
    }

    return results
  }
}
