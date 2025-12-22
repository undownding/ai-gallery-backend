import { Controller, Post, Query } from '@nestjs/common'
import { S3Service } from './s3.service'
import { ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  GeneratePresignedUrlsQueryDTO,
  GeneratePresignedUrlsRespDTO,
} from './dto/s3.dto'
import { ApiSummary } from '../common/nestjs-ext'

@ApiTags('S3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('presigned-urls')
  @ApiSummary('生成指定数量的 putObject presigned URLs')
  @ApiResponse({
    status: 200,
    description: '成功生成 presigned URLs',
    type: GeneratePresignedUrlsRespDTO,
  })
  async generatePresignedUrls(
    @Query() query: GeneratePresignedUrlsQueryDTO,
  ): Promise<GeneratePresignedUrlsRespDTO> {
    const urls = await this.s3Service.generatePutObjectPresignedUrls(
      query.count,
      query.expiresIn,
    )

    return {
      urls,
      count: query.count,
      expiresIn: query.expiresIn || 3600,
    }
  }
}
