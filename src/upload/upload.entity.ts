import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  RelationId,
  UpdateDateColumn,
} from 'typeorm'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { User } from '../user/user.entity'

// 该 entity 记录了一份 S3 上保存的文件信息
@Entity()
export class Upload {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({
    description: 'The unique identifier for the upload record',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  key: string

  @Column({
    type: 'varchar',
    length: 72,
    nullable: true,
  })
  eTag?: string

  @Column({
    type: 'int',
    nullable: true,
  })
  size?: number

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  @ApiPropertyOptional({
    description: 'The URL of the uploaded file, if available',
    example: 'https://example.com/uploads/file.jpg',
  })
  url?: string

  @ManyToOne(() => User)
  @JoinColumn()
  @ApiProperty({
    type: () => User,
    description: 'The user who created the upload',
  })
  user: Relation<User>

  @RelationId((upload: Upload) => upload.user)
  userId: string

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  @ApiProperty()
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp with time zone',
  })
  @ApiProperty()
  updatedAt: Date
}
