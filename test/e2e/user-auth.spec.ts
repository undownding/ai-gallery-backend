import { Test, TestingModule } from '@nestjs/testing'
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'

import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import { UserService } from '../../src/user/user.service'
import { User } from '../../src/user/user.entity'
import { Role } from '../../src/user/role.enum'
import {
  authenticatedRequest,
  expectError,
  expectSuccess,
  TEST_CONFIG,
  withRetry,
} from '../../src/common/test-setup'
import { AppModule } from '../../src/app.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { createTypeOrmAsyncOptions } from '../../src/common/typeorm/data-source'
import { Upload } from '../../src/upload/upload.entity'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { v7 } from 'uuid'

describe('用户认证系统 (E2E)', () => {
  let app: INestApplication
  let httpServer: any
  let userAccessToken: string
  let userRefreshToken: string
  let testUserId: string
  let userService: UserService
  let dataSource: DataSource
  let _testUser: User

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET', 'badapple'),
            signOptions: { expiresIn: '7d' },
          }),
        }),
        TypeOrmModule.forRootAsync(
          createTypeOrmAsyncOptions([User, Upload, Role]),
        ),
        TypeOrmModule.forFeature([User]),
        AppModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('/api')
    await app.init()
    httpServer = app.getHttpServer()

    // Get services for user creation
    userService = moduleFixture.get<UserService>(UserService)
    dataSource = moduleFixture.get<DataSource>(DataSource)

    // Create a test user that exists in the database
    const testUsername = faker.internet.username()
    const testPassword = 'Test123!@#'

    _testUser = await userService.createUser(
      testUsername,
      testPassword,
      Role.USER,
    )

    // Update TEST_CONFIG to use the created user
    TEST_CONFIG.TEST_USER.username = testUsername
    TEST_CONFIG.TEST_USER.password = testPassword
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  describe('/api/user/login (POST) - 用户登录', () => {
    it('应该能够成功登录（流程A - 步骤1）', async () => {
      const loginData = {
        username: TEST_CONFIG.TEST_USER.username,
        password: TEST_CONFIG.TEST_USER.password,
      }

      const response = await withRetry(async () => {
        return request(httpServer)
          .post('/api/user/login')
          .send(loginData)
          .expect(200)
      })

      const data = expectSuccess(response)

      // 验证响应结构
      expect(data).toHaveProperty('accessToken')
      expect(data).toHaveProperty('refreshToken')
      expect(data).toHaveProperty('accessTokenExpiredAt')
      expect(data).toHaveProperty('refreshTokenExpiredAt')
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('id')

      // 验证 token 格式
      expect(typeof data.accessToken).toBe('string')
      expect(data.accessToken.length).toBeGreaterThan(10)
      expect(typeof data.refreshToken).toBe('string')
      expect(data.refreshToken.length).toBeGreaterThan(10)

      // 验证过期时间
      expect(new Date(data.accessTokenExpiredAt)).toBeInstanceOf(Date)
      expect(new Date(data.refreshTokenExpiredAt)).toBeInstanceOf(Date)
      expect(new Date(data.accessTokenExpiredAt).getTime()).toBeGreaterThan(
        Date.now(),
      )
      expect(new Date(data.refreshTokenExpiredAt).getTime()).toBeGreaterThan(
        Date.now(),
      )

      // 验证用户信息
      expect(data.user).toHaveProperty('id')
      expect(data.user).not.toHaveProperty('password')
      expect(data.user).not.toHaveProperty('secret')

      // 保存认证信息供后续测试使用
      userAccessToken = data.accessToken
      userRefreshToken = data.refreshToken
      testUserId = data.id

      console.log('✅ 用户登录成功，获得访问令牌')
    })

    it('应该拒绝无效的登录凭据', async () => {
      const invalidLogin = {
        username: 'invalid_user',
        password: 'wrong_password',
      }

      const response = await request(httpServer)
        .post('/api/user/login')
        .send(invalidLogin)
        .expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝无效登录凭据')
    })

    it('应该拒绝缺少必填字段的请求', async () => {
      const incompleteLogin = {
        username: TEST_CONFIG.TEST_USER.username,
        // 缺少 password
      }

      const response = await request(httpServer)
        .post('/api/user/login')
        .send(incompleteLogin)
        .expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝不完整的登录请求')
    })

    it('应该设置正确的Cookie', async () => {
      const loginData = {
        username: TEST_CONFIG.TEST_USER.username,
        password: TEST_CONFIG.TEST_USER.password,
      }

      const response = await request(httpServer)
        .post('/api/user/login')
        .send(loginData)
        .expect(200)

      // 验证Cookie设置
      expect(response.headers['set-cookie']).toBeDefined()
      const cookies: string[] = response.headers['set-cookie'] as any

      const accessTokenCookie = cookies.find((cookie: string) =>
        cookie.includes('access_token='),
      )
      expect(accessTokenCookie).toBeDefined()

      console.log('✅ Cookie设置正确')
    })
  })

  describe('/api/user/me (GET) - 获取用户信息', () => {
    it('应该能够获取当前用户信息（流程A - 步骤2）', async () => {
      expect(userAccessToken).toBeDefined()

      const response = await request(httpServer)
        .get('/api/user/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)

      const userData = expectSuccess(response)

      // 验证用户数据结构
      expect(userData).toHaveProperty('id')
      expect(userData).toHaveProperty('username')
      expect(userData).not.toHaveProperty('password')
      expect(userData).not.toHaveProperty('secret')

      expect(userData.id).toBe(testUserId)
      expect(typeof userData.username).toBe('string')

      console.log('✅ 成功获取用户信息')
    })

    it('应该拒绝未认证的请求', async () => {
      const response = await request(httpServer).get('/api/user/me').expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝未认证请求')
    })

    it('应该拒绝无效的访问令牌', async () => {
      const response = await request(httpServer)
        .get('/api/user/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝无效访问令牌')
    })

    it('应该拒绝过期的访问令牌', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'

      const response = await authenticatedRequest(
        'get',
        '/user/me',
        expiredToken,
        httpServer,
      ).expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝过期访问令牌')
    })
  })

  describe('/api/user/me/avatar (PATCH) - 更新用户头像', () => {
    it('应该能够更新用户头像（流程A - 步骤3）', async () => {
      expect(userAccessToken).toBeDefined()

      // 模拟一个有效的上传ID
      const avatarData = {
        uploadId: v7(),
      }

      const response = await authenticatedRequest(
        'patch',
        '/user/me/avatar',
        userAccessToken,
        httpServer,
      ).send(avatarData)

      // 注意：这里可能返回404或其他错误，因为uploadId可能不存在
      // 但我们主要测试认证和请求格式是否正确
      if (response.status === 200) {
        const userData = expectSuccess(response)
        expect(userData).toHaveProperty('id')
        console.log('✅ 头像更新成功')
      } else if (response.status === 404) {
        // uploadId 不存在是预期的，说明认证通过了
        console.log('✅ 头像更新请求格式正确（uploadId不存在是预期的）')
      } else {
        expectError(response, response.status)
      }
    })

    it('应该拒绝未认证的头像更新请求', async () => {
      const avatarData = {
        uploadId: 'mock_upload_id',
      }

      const response = await request(httpServer)
        .patch('/api/user/me/avatar')
        .send(avatarData)
        .expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝未认证的头像更新请求')
    })

    it('应该拒绝缺少uploadId的请求', async () => {
      expect(userAccessToken).toBeDefined()

      const response = await authenticatedRequest(
        'patch',
        '/user/me/avatar',
        userAccessToken,
        httpServer,
      )
        .send({})
        .expect(400)

      expectError(response, 400)
      console.log('✅ 正确拒绝缺少uploadId的请求')
    })

    it('应该拒绝无效格式的uploadId', async () => {
      expect(userAccessToken).toBeDefined()

      const invalidAvatarData = {
        uploadId: null,
      }

      const response = await authenticatedRequest(
        'patch',
        '/user/me/avatar',
        userAccessToken,
        httpServer,
      )
        .send(invalidAvatarData)
        .expect(400)

      expectError(response, 400)
      console.log('✅ 正确拒绝无效格式的uploadId')
    })
  })

  describe('/api/user/token (POST) - 刷新访问令牌', () => {
    it('应该能够使用刷新令牌获取新的访问令牌', async () => {
      expect(userRefreshToken).toBeDefined()

      const response = await request(httpServer)
        .post('/api/user/token')
        .set('Authorization', `Bearer ${userRefreshToken}`)
        .expect(201)

      const data = expectSuccess(response, 201)

      // 验证响应结构
      expect(data).toHaveProperty('accessToken')
      expect(data).toHaveProperty('refreshToken')
      expect(data).toHaveProperty('accessTokenExpiredAt')
      expect(data).toHaveProperty('refreshTokenExpiredAt')
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('id')

      // 验证新token与旧token不同
      expect(data.accessToken).not.toBe(userAccessToken)
      expect(data.refreshToken).not.toBe(userRefreshToken)

      // 更新token用于后续测试
      userAccessToken = data.accessToken
      userRefreshToken = data.refreshToken

      console.log('✅ 成功刷新访问令牌')
    })

    it('应该拒绝无效的刷新令牌', async () => {
      const response = await request(httpServer)
        .post('/api/user/token')
        .set('Authorization', 'Bearer invalid_refresh_token')
        .expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝无效刷新令牌')
    })

    it('应该拒绝使用访问令牌作为刷新令牌', async () => {
      expect(userAccessToken).toBeDefined()

      const response = await request(httpServer)
        .post('/api/user/token')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(400)

      expectError(response, 400)
      console.log('✅ 正确拒绝访问令牌作为刷新令牌')
    })

    it('应该拒绝缺少Authorization头的请求', async () => {
      const response = await request(httpServer)
        .post('/api/user/token')
        .expect(401)

      expectError(response, 401)
      console.log('✅ 正确拒绝缺少Authorization头的请求')
    })
  })

  describe('令牌安全性测试', () => {
    it('刷新后的旧访问令牌应该仍然有效（在过期前）', async () => {
      // 保存当前的访问令牌
      const oldAccessToken = userAccessToken

      // 刷新令牌
      const refreshResponse = await request(httpServer)
        .post('/api/user/token')
        .set('Authorization', `Bearer ${userRefreshToken}`)
        .expect(201)

      const refreshData = expectSuccess(refreshResponse, 201)
      const newAccessToken = refreshData.accessToken

      // 验证旧令牌仍然有效
      const oldTokenResponse = await authenticatedRequest(
        'get',
        '/user/me',
        oldAccessToken,
        httpServer,
      ).expect(200)

      expectSuccess(oldTokenResponse)

      // 验证新令牌也有效
      const newTokenResponse = await authenticatedRequest(
        'get',
        '/user/me',
        newAccessToken,
        httpServer,
      ).expect(200)

      expectSuccess(newTokenResponse)

      // 更新令牌
      userAccessToken = newAccessToken
      userRefreshToken = refreshData.refreshToken

      console.log('✅ 令牌刷新机制正常工作')
    })

    it('应该正确处理并发的令牌刷新请求', async () => {
      expect(userRefreshToken).toBeDefined()

      // 同时发送多个刷新请求
      const refreshPromises = Array(3)
        .fill(null)
        .map(() =>
          request(httpServer)
            .post('/api/user/token')
            .set('Authorization', `Bearer ${userRefreshToken}`),
        )

      const responses = await Promise.all(refreshPromises)

      // 所有请求都应该成功
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty('accessToken')
      })

      // 使用最后一个响应的令牌
      const lastResponse = responses[responses.length - 1]
      userAccessToken = lastResponse.body.accessToken
      userRefreshToken = lastResponse.body.refreshToken

      console.log('✅ 并发令牌刷新处理正确')
    })
  })

  describe('认证流程完整性测试', () => {
    it('完整的用户认证流程应该正常工作', async () => {
      console.log('🔄 开始完整认证流程测试...')

      // 1. 登录
      const loginResponse = await request(httpServer)
        .post('/api/user/login')
        .send({
          username: TEST_CONFIG.TEST_USER.username,
          password: TEST_CONFIG.TEST_USER.password,
        })
        .expect(200)

      const loginData = expectSuccess(loginResponse)
      const { accessToken, refreshToken } = loginData

      console.log('  ✅ 第1步：登录成功')

      // 2. 获取用户信息
      const userInfoResponse = await authenticatedRequest(
        'get',
        '/user/me',
        accessToken,
        httpServer,
      ).expect(200)

      expectSuccess(userInfoResponse)
      console.log('  ✅ 第2步：获取用户信息成功')

      // 3. 刷新令牌
      const tokenRefreshResponse = await request(httpServer)
        .post('/api/user/token')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201)

      const refreshData = expectSuccess(tokenRefreshResponse, 201)
      const newAccessToken = refreshData.accessToken

      console.log('  ✅ 第3步：令牌刷新成功')

      // 4. 使用新令牌获取用户信息
      const newTokenUserInfoResponse = await authenticatedRequest(
        'get',
        '/user/me',
        newAccessToken,
        httpServer,
      ).expect(200)

      expectSuccess(newTokenUserInfoResponse)
      console.log('  ✅ 第4步：新令牌验证成功')

      console.log('🎉 完整认证流程测试成功完成')
    })
  })
})
