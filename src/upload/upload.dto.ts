import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsAlpha,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UploadQueryDTO {
  @ApiPropertyOptional({
    description: '待上传的文件名的后缀，如 png jpeg，长度 2-4',
    example: 'png',
  })
  @IsString()
  @IsOptional()
  @IsAlpha()
  @MinLength(2)
  @MaxLength(4)
  ext?: string
}
