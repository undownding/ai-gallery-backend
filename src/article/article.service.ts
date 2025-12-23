import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { type FindOptionsWhere, LessThan } from 'typeorm'
import { BaseCrudService } from '../common/base-crud-service'
import { Upload } from '../upload/upload.entity'
import { UploadService } from '../upload/upload.service'
import { User } from '../user/user.entity'
import { Article } from './article.entity'
import { ArticleListRespDto } from './dto/article-list-resp.dto'
import { ArticlesQueryDto, DEFAULT_ARTICLE_PAGE_SIZE } from './dto/articles-query.dto'
import { ArticleCreateDto } from './dto/article-create.dto'

@Injectable()
export class ArticleService extends BaseCrudService<Article> {
  constructor(private readonly uploadService: UploadService) {
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

  async updateArticle(
    articleId: string,
    update: Partial<Article>,
    operatorUserId: string
  ): Promise<Article> {
    const article = await this.getById(articleId)
    if (!article) {
      throw new NotFoundException('Article not found.')
    }
    if (article.userId !== operatorUserId) {
      throw new ForbiddenException('You are not the author of this article.')
    }
    return this.repository.save(this.repository.merge(article, update))
  }

  async createArticle(createDto: ArticleCreateDto, author: User): Promise<Article> {
    const media = (createDto.mediaId ?? []).map((id) => ({ id }) as Upload)
    const sources = (createDto.sourcesId ?? []).map((id) => ({ id }) as Upload)

    let thumbnail: Upload | null = null
    const firstMediaId = createDto.mediaId?.[0]
    if (firstMediaId) {
      thumbnail = await this.uploadService.generateSquareThumbnailFromUpload(firstMediaId, {
        id: author.id,
        login: author.login
      })
    }

    const article = this.repository.create({
      text: createDto.text,
      title: createDto.title ?? null,
      author,
      media,
      sources,
      thumbnail: thumbnail ?? null
    })

    return this.repository.save(article)
  }
}
