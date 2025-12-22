import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  UpdateDateColumn
} from 'typeorm'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { User } from '../user/user.entity'
import { Upload } from '../upload/upload.entity'

@Entity()
export class Article {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Primary identifier' })
  id: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  @ApiPropertyOptional({ description: 'Article title' })
  title?: string | null

  @Column({ type: 'text' })
  @ApiProperty({ description: 'Markdown or rich text payload' })
  text: string

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: 'Whether the article is publicly visible', default: false })
  isPublic: boolean

  @ManyToOne(() => User, { onDelete: 'CASCADE', onUpdate: 'CASCADE', nullable: false, eager: true })
  @JoinColumn()
  @ApiProperty({ type: () => User, description: 'Author of the article' })
  author: Relation<User>

  @RelationId((article: Article) => article.author)
  userId: string

  @OneToOne(() => Upload, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn()
  @ApiPropertyOptional({ type: () => Upload, description: 'Thumbnail image upload' })
  thumbnail?: Relation<Upload> | null

  @RelationId((article: Article) => article.thumbnail)
  thumbnailUploadId?: string | null

  @ManyToMany(() => Upload, { eager: true })
  @JoinTable({ name: 'article_media_assets' })
  @ApiProperty({
    type: () => Upload,
    isArray: true,
    description: 'Media assets embedded inside the article'
  })
  media: Relation<Upload[]> = []

  @ManyToMany(() => Upload, { eager: true })
  @JoinTable({ name: 'article_source_assets' })
  @ApiProperty({
    type: () => Upload,
    isArray: true,
    description: 'Source files referenced by the article'
  })
  sources: Relation<Upload[]> = []

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date
}
