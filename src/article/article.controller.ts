import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ApiSummary } from '../common/nestjs-ext'
import { ArticleService } from './article.service'
import { ArticlesQueryDto } from './dto/articles-query.dto'
import { ArticleListRespDto } from './dto/article-list-resp.dto'

@Controller('articles')
@ApiTags('Article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @ApiSummary('获取公开文章列表')
  @ApiOkResponse({ type: () => ArticleListRespDto })
  async listArticles(@Query() query: ArticlesQueryDto): Promise<ArticleListRespDto> {
    return this.articleService.listArticles(query)
  }
}
