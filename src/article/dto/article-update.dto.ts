import {PartialType, PickType} from "@nestjs/swagger"
import {Article} from "../article.entity"

export class ArticleUpdateDto extends PartialType(PickType(Article, ['isPublic', 'title'])) {}
