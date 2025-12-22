import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'

export const DEFAULT_ARTICLE_PAGE_SIZE = 20
export const MAX_ARTICLE_PAGE_SIZE = 50

export class ArticlesQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor-based pagination: return entries strictly before this article id',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID()
  afterId?: string

  @ApiPropertyOptional({
    description: 'Maximum number of articles to return in a single page',
    default: DEFAULT_ARTICLE_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_ARTICLE_PAGE_SIZE
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_ARTICLE_PAGE_SIZE)
  limit: number = DEFAULT_ARTICLE_PAGE_SIZE
}
