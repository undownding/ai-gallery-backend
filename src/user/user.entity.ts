import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

@Index('users_github_id_unique', ['githubId'], { unique: true })
@Index('users_email_unique', ['email'], { unique: true })
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Primary identifier for the user record' })
  id: string

  @Column({ type: 'text', nullable: false })
  @ApiProperty({ description: 'GitHub user identifier' })
  githubId: string

  @Column({ type: 'text', nullable: false })
  @ApiProperty({ description: 'GitHub login handle' })
  login: string

  @Column({ type: 'text', nullable: true })
  @ApiPropertyOptional({ description: 'Display name taken from GitHub' })
  name?: string | null

  @Column({ type: 'text', nullable: true })
  @ApiPropertyOptional({ description: 'Email address associated with the user' })
  email?: string | null

  @Column({ type: 'text', nullable: true })
  @ApiPropertyOptional({ description: 'Avatar image URL' })
  avatarUrl?: string | null

  @CreateDateColumn({ type: 'timestamp with time zone' })
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  @ApiProperty({ description: 'Update timestamp' })
  updatedAt: Date

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  @ApiProperty({ description: 'Last login timestamp' })
  lastLoginAt: Date

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: 'Marks whether the user is a creator', default: false })
  isCreator: boolean
}
