import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { ASPECT_RATIO_VALUES, IMAGE_SIZE_VALUES } from '../task.type'
import type { AspectRatio, ImageSize } from '../task.type'

export class GeminiTaskCreateDto {
  @ApiProperty({ description: 'Prompt that drives Gemini to generate text and/or imagery' })
  @IsString()
  @IsNotEmpty()
  prompt: string

  @ApiPropertyOptional({
    enum: ASPECT_RATIO_VALUES,
    description: 'Aspect ratio for generated image'
  })
  @IsOptional()
  @IsIn(ASPECT_RATIO_VALUES)
  aspectRatio?: AspectRatio

  @ApiPropertyOptional({ enum: IMAGE_SIZE_VALUES, description: 'Output resolution preset' })
  @IsOptional()
  @IsIn(IMAGE_SIZE_VALUES)
  imageSize?: ImageSize

  @ApiPropertyOptional({
    description: 'Uploads used as style/content references',
    type: String,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  referenceUploadIds?: string[]
}

export class GeminiTaskCreateResponseDto {
  @ApiProperty({ description: 'Identifier to stream the Gemini task progress' })
  taskId: string
}
