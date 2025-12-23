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
  Put,
  Query,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger'
import { UploadService } from './upload.service'
import { Upload } from './upload.entity'
import { UploadImageBodyDTO, UploadQueryDTO } from './upload.dto'
import heredoc from 'tsheredoc'
import { NeedLogin } from '../user/need-login.decorator'
import { Me } from '../user/me.decorator'
import { User } from '../user/user.entity'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import type { Multer } from 'multer'

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

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
    `
  })
  @ApiOkResponse({
    type: () => Upload
  })
  @ApiBearerAuth()
  @NeedLogin()
  async getPresignedUrl(@Query() query: UploadQueryDTO, @Me() me: User): Promise<Upload> {
    return this.uploadService.presign(query.ext ?? 'jpg', { id: me.id, login: me.login })
  }

  @Post(':uploadId/complete')
  @ApiOperation({
    summary: 'Complete upload',
    description: 'Set ETag and size for the uploaded file'
  })
  @ApiOkResponse({
    type: () => Upload
  })
  @HttpCode(HttpStatus.OK)
  async completeUpload(@Param('uploadId') id: string): Promise<Upload> {
    // Validate uploadId format
    if (!id || !id.trim()) {
      throw new BadRequestException('Upload ID is required')
    }

    // Validate UUID format (basic validation)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid upload ID format')
    }

    const upload = await this.uploadService.getById(id)

    if (!upload) {
      throw new NotFoundException('Upload not found')
    }

    return upload
  }
  @Put('/image')
  @ApiOperation({
    summary: '上传图片并转换为 WebP',
    description: '接收图片文件，转换为 WebP 后写入 S3 并返回 upload 对象'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadImageBodyDTO })
  @ApiOkResponse({
    type: () => Upload
  })
  @ApiBearerAuth()
  @NeedLogin()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES }
    })
  )
  async uploadImage(@UploadedFile() file: Multer.File, @Me() me: User): Promise<Upload> {
    if (!file) {
      throw new BadRequestException('Image file is required')
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are supported')
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Image file is empty')
    }

    const upload = await this.uploadService.uploadImageBuffer(file.buffer, {
      id: me.id,
      login: me.login
    })

    if (!upload) {
      throw new BadRequestException('Failed to process image')
    }

    return upload
  }
}
