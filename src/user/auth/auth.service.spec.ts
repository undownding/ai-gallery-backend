import { AuthService } from './auth.service'
import { Test, TestingModule } from '@nestjs/testing'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { randomBytes } from 'crypto'
import argon2 from 'argon2'
import { UserService } from '../user.service'
import { UploadModule } from '../../upload/upload.module'
import { User } from '../user.entity'
import { faker } from '@faker-js/faker/locale/en'
import { createTypeOrmAsyncOptions } from '../../common/typeorm/data-source'
import { Upload } from '../../upload/upload.entity'
import { Role } from '../role.enum'

describe('AuthService', () => {
  let authService: AuthService
  let userService: UserService
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testUser: User
  let testUsername: string
  let testPassword: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        UploadModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET', 'badapple'),
            signOptions: { expiresIn: '7d' }
          })
        }),
        TypeOrmModule.forRootAsync(createTypeOrmAsyncOptions([User, Upload, Role])),
        TypeOrmModule.forFeature([User])
      ],
      providers: [UserService, AuthService]
    }).compile()
    authService = module.get(AuthService)
    userService = module.get(UserService)

    // 创建测试用户
    testUsername = faker.internet.username()
    testPassword = faker.internet.password()
    const secret = randomBytes(96).toString('base64')
    testUser = await userService.create({
      username: testUsername,
      password: await argon2.hash(testPassword, {
        secret: Buffer.from(secret, 'base64')
      }),
      secret
    })
  })

  it('should return false if user not found', async () => {
    const result = await authService.checkUser('not_exist_user', 'any_password')
    expect(result).toBe(false)
  })

  it('should return true for valid user', async () => {
    const result = await authService.checkUser(testUsername, testPassword)
    expect(result).toBe(true)
  })

  it('should return false if password does not match', async () => {
    const result = await authService.checkUser(testUsername, 'wrongpass')
    expect(result).toBe(false)
  })
})
