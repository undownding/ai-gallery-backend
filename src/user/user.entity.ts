import {
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn
} from 'typeorm'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, Matches } from 'class-validator'
import { Role } from './role.enum'
import { Upload } from '../upload/upload.entity'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  @Index({ unique: true, where: 'email IS NOT NULL' })
  @ApiPropertyOptional({
    description: '用户邮箱',
    example: 'foo@bar.com'
  })
  email?: string

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true
  })
  @ApiPropertyOptional()
  nickname?: string

  @Column({
    type: 'varchar',
    length: 255,
    unique: true
  })
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9_.]{4,15}$/)
  username: string

  @OneToOne(() => Upload, { eager: true })
  @JoinColumn()
  @ApiPropertyOptional({
    description: '用户头像对应的 upload',
    type: () => Upload
  })
  avatar?: Relation<Upload>

  @ApiPropertyOptional({
    description: '用户头像 URL',
    example: 'https://example.com/avatar.png'
  })
  avatarUrl?: string | null

  @Column({
    type: 'varchar',
    length: 255,
    select: false
  })
  password: string

  @Column({
    type: 'varchar',
    length: 128,
    select: false
  })
  secret: string

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER
  })
  @ApiProperty({
    enum: Role,
    description: '用户角色',
    example: Role.USER
  })
  role: Role

  @Column({
    type: 'varchar',
    length: 255,
    select: false,
    nullable: true
  })
  appleId?: string

  @CreateDateColumn({
    type: 'timestamp with time zone'
  })
  @ApiProperty()
  createdAt: Date

  @UpdateDateColumn({
    type: 'timestamp with time zone'
  })
  @ApiProperty()
  updatedAt: Date

  @AfterLoad()
  setAvatarUrl(): void {
    if (this.avatar) {
      this.avatarUrl = this.avatar.url
    } else {
      this.avatarUrl = null
    }
  }
}
