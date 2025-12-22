import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Article } from '../article.entity'

export class ArticleListPageInfoDto {
  @ApiPropertyOptional({
    description: 'Cursor for fetching the next page of results'
  })
  nextAfterId: string | null

  @ApiProperty({
    description: 'Indicates whether there are more articles to fetch'
  })
  hasMore: boolean
}

export class ArticleListRespDto {
  @ApiProperty({
    type: () => Article,
    isArray: true,
    description: 'List of articles in the current page'
  })
  data: Article[]

  @ApiProperty({
    type: () => ArticleListPageInfoDto,
    description: 'Pagination metadata'
  })
  pageInfo: ArticleListPageInfoDto
}
