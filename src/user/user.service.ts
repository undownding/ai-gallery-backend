import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DeepPartial, Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import argon2 from 'argon2'
import { BaseCrudService, IDType } from '../common/base-crud-service'
import { User } from './user.entity'
import { UploadService } from '../upload/upload.service'
import { Role } from './role.enum'

@Injectable()
export class UserService extends BaseCrudService<User> {
  @InjectRepository(User)
  private readonly userRepository: Repository<User>
  @Inject(UploadService)
  private readonly uploadService: UploadService

  constructor() {
    super(User)
  }

  async getByUserName(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        username
      }
    })
  }

  public async createUser(
    username: string,
    password: string,
    role = Role.UNCHECKED_USER
  ): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.getByUserName(username)
    if (existingUser) {
      throw new BadRequestException('Username already exists')
    }

    // 生成密钥并哈希密码
    const secret = randomBytes(32).toString('base64')
    const hashedPassword = await argon2.hash(password, {
      secret: Buffer.from(secret, 'base64')
    })

    // 创建用户
    const user = await this.create({
      username,
      password: hashedPassword,
      role,
      secret,
      nickname: username // 默认使用用户名作为昵称
    })

    // 创建初始积分账户
    return user
  }

  override async updateById(id: IDType, data: DeepPartial<User>): Promise<User> {
    if (data.username) {
      const exists = await this.userRepository.findOne({
        where: { username: data.username }
      })
      if (exists && exists.id !== id) {
        throw new ConflictException('Username already exists')
      }
    }
    return super.updateById(id, data)
  }

  public async resetPassword(id: IDType, newPassword: string): Promise<User> {
    const user = await this.getById(id)
    if (!user) {
      throw new BadRequestException('User not found')
    }
    const secret = randomBytes(32).toString('base64')
    const hashedPassword = await argon2.hash(newPassword, {
      secret: Buffer.from(secret, 'base64')
    })
    return this.updateById(id, { password: hashedPassword, secret })
  }

  public async setAvatar(userId: string, avatarId: string): Promise<User> {
    const avatar = await this.uploadService.getById(avatarId)
    if (!avatar) {
      throw new BadRequestException('Invalid avatar upload ID')
    }
    return this.updateById(userId, { avatar })
  }
}
