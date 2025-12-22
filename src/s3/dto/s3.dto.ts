import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, Min, Max } from 'class-validator'
import { Transform } from 'class-transformer'

export class GeneratePresignedUrlsQueryDTO {
  @ApiProperty({
    description: '需要生成的 URL 数量',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  count: number

  @ApiProperty({
    description: 'URL 过期时间（秒），默认 3600 秒（1小时）',
    example: 3600,
    minimum: 60,
    maximum: 604800, // 7天
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(604800)
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  expiresIn?: number
}

export class PresignedUrlItemDTO {
  @ApiProperty({
    description: '生成的 UUID v7 标识符',
    example: '01234567-89ab-7def-0123-456789abcdef',
  })
  id: string

  @ApiProperty({
    description: '文件的完整 S3 key',
    example: 'public/01234567-89ab-7def-0123-456789abcdef.png',
  })
  key: string

  @ApiProperty({
    description: 'presigned URL',
    example:
      'https://your-bucket.s3.us-east-1.amazonaws.com/public/01234567-89ab-7def-0123-456789abcdef.png?...',
  })
  url: string
}

export class GeneratePresignedUrlsRespDTO {
  @ApiProperty({
    description: '生成的 presigned URLs 列表',
    type: [PresignedUrlItemDTO],
  })
  urls: PresignedUrlItemDTO[]

  @ApiProperty({
    description: '生成的 URL 数量',
    example: 5,
  })
  count: number

  @ApiProperty({
    description: 'URL 过期时间（秒）',
    example: 3600,
  })
  expiresIn: number
}
