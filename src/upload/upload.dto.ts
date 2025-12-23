import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsAlpha, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UploadQueryDTO {
  @ApiPropertyOptional({
    description: '待上传的文件名的后缀，如 png jpeg，长度 2-4',
    example: 'png'
  })
  @IsString()
  @IsOptional()
  @IsAlpha()
  @MinLength(2)
  @MaxLength(4)
  ext?: string
}

export class UploadImageBodyDTO {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '要上传的图片文件'
  })
  file: unknown
}
