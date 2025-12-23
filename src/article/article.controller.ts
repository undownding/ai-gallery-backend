import {Body, Controller, Get, Param, Patch, Query} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {ApiSummary} from '../common/nestjs-ext'
import {ArticleService} from './article.service'
import {ArticlesQueryDto} from './dto/articles-query.dto'
import {ArticleListRespDto} from './dto/article-list-resp.dto'
import {Article} from './article.entity'
import {ArticleUpdateDto} from './dto/article-update.dto'
import {NeedLogin} from "../user/need-login.decorator"
import {Me} from "../user/me.decorator"
import {User} from "../user/user.entity"

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

  @Get(':id')
  @ApiSummary('获取单篇公开文章详情')
  @ApiOkResponse({ type: () => Article })
  async getArticleById(@Param('id') id: string): Promise<Article | null> {
    return this.articleService.getById(id)
  }

  @Patch(':id')
  @NeedLogin()
  @ApiSummary('更新文章（仅限作者本人操作）')
  @ApiOkResponse({ type: () => Article })
  async updateArticleById(
    @Param('id') id: string,
    @Body() body: ArticleUpdateDto,
    @Me() me: User
  ): Promise<Article> {
    return this.articleService.updateArticle(id, body, me.id)
  }
}
