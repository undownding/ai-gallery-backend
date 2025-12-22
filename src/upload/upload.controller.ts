import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { UploadService } from './upload.service'
import { Upload } from './upload.entity'
import { UploadQueryDTO } from './upload.dto'
import heredoc from 'tsheredoc'
import { type IToken, Me, OptionalLogin } from '../user/auth/auth.decorator'

@Controller('upload')
@ApiTags('上传')
export class UploadController {
  @Inject(UploadService)
  private readonly uploadService: UploadService

  @Get('/presigned')
  @ApiOperation({
    summary: '获取预签名上传地址',
    description: heredoc`
    用于上传文件到云存储。
    
    返回一个特殊的 upload 对象，其中 url 字段即为 presigned URL。
    
    对其发起 PUT 请求即可上传文件。
    `,
  })
  @ApiOkResponse({
    type: () => Upload,
  })
  @ApiBearerAuth()
  @OptionalLogin()
  async getPresignedUrl(
    @Query() query: UploadQueryDTO,
    @Me() me: IToken,
  ): Promise<Upload> {
    return this.uploadService.presign(query.ext ?? 'jpg', me.id)
  }

  @Post(':uploadId/complete')
  @ApiOperation({
    summary: 'Complete upload',
    description: 'Set ETag and size for the uploaded file',
  })
  @ApiOkResponse({
    type: () => Upload,
  })
  @HttpCode(HttpStatus.OK)
  async completeUpload(@Param('uploadId') id: string): Promise<Upload> {
    // Validate uploadId format
    if (!id || !id.trim()) {
      throw new BadRequestException('Upload ID is required')
    }

    // Validate UUID format (basic validation)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid upload ID format')
    }

    const upload = await this.uploadService.getById(id)

    if (!upload) {
      throw new NotFoundException('Upload not found')
    }

    return upload
  }
}
