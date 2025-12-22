import { Injectable } from '@nestjs/common'
import { type FindOptionsWhere, LessThan } from 'typeorm'
import { BaseCrudService } from '../common/base-crud-service'
import { Article } from './article.entity'
import { ArticleListRespDto } from './dto/article-list-resp.dto'
import { ArticlesQueryDto, DEFAULT_ARTICLE_PAGE_SIZE } from './dto/articles-query.dto'

@Injectable()
export class ArticleService extends BaseCrudService<Article> {
  constructor() {
    super(Article)
  }

  async listArticles(query: ArticlesQueryDto): Promise<ArticleListRespDto> {
    const limit = query.limit ?? DEFAULT_ARTICLE_PAGE_SIZE

    const where: FindOptionsWhere<Article> = {
      isPublic: true,
      ...(query.afterId ? { id: LessThan(query.afterId) } : {})
    }

    const data = await this.repository.find({
      where,
      order: { id: 'DESC' },
      take: limit
    })

    const nextAfterId = data.length === limit ? data[data.length - 1].id : null

    return {
      data,
      pageInfo: {
        nextAfterId,
        hasMore: nextAfterId !== null
      }
    }
  }
}
