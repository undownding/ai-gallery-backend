import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator'

export class ArticleCreateDto {
  @ApiProperty({ description: 'Article body content (markdown or rich text)' })
  @IsString()
  @IsNotEmpty()
  text: string

  @ApiPropertyOptional({ description: 'Article title', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @ApiProperty({
    description: 'Upload ids for media embedded within the article',
    type: String,
    isArray: true
  })
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  mediaId: string[]

  @ApiProperty({
    description: 'Upload ids for source assets referenced by the article',
    type: String,
    isArray: true
  })
  @IsDefined()
  @IsArray()
  @IsUUID('4', { each: true })
  sourcesId: string[]
}
