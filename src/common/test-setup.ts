import { INestApplication } from '@nestjs/common'
import { TestingModule } from '@nestjs/testing'
import request from 'supertest'

declare global {
  var app: INestApplication
  var testModule: TestingModule
  var httpServer: any
}

// 测试配置常量
export const TEST_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  API_PREFIX: '/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  // 测试用户数据
  TEST_USER: {
    username: 'test_user_' + Date.now(),
    password: 'Test123!@#',
    email: 'test@example.com',
  },
  ADMIN_USER: {
    username: 'admin_user_' + Date.now(),
    password: 'Admin123!@#',
    email: 'admin@example.com',
  },
}

// 工具函数：重试机制
export const withRetry = async (
  operation: () => Promise<any>,
  maxAttempts: number = TEST_CONFIG.RETRY_ATTEMPTS,
  delay: number = TEST_CONFIG.RETRY_DELAY,
): Promise<any> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

// 工具函数：API请求
export const apiRequest = (
  method: 'get' | 'post' | 'patch' | 'delete',
  endpoint: string,
) => {
  return request(global.httpServer)[method](
    `${TEST_CONFIG.API_PREFIX}${endpoint}`,
  )
}

// 工具函数：带认证的API请求
export const authenticatedRequest = (
  method: 'get' | 'post' | 'patch' | 'delete',
  endpoint: string,
  token: string,
  httpServer?: any,
) => {
  const server = httpServer || global.httpServer
  return request(server)
    [method](`${TEST_CONFIG.API_PREFIX}${endpoint}`)
    .set('Authorization', `Bearer ${token}`)
}

// 工具函数：期望成功响应
export const expectSuccess = (response: any, expectedStatus: number = 200) => {
  expect(response.status).toBe(expectedStatus)
  expect(response.body).toBeDefined()
  return response.body
}

// 工具函数：期望错误响应
export const expectError = (response: any, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus)
  expect(response.body).toBeDefined()
  if (response.body.message) {
    expect(typeof response.body.message).toBe('string')
  }
  return response.body
}

// 工具函数：生成随机字符串
export const generateRandomString = (length: number = 10): string => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

// 工具函数：等待
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
