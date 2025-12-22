import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import { JwtGuard } from './guards/auth-jwt.guard'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { Role } from '../role.enum'
import { HttpExceptionType } from './auth.type'
import { Roles, RolesGuard } from './guards/role.guard'
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard'

export type TokenType = 'access_token' | 'refresh_token'

export interface IToken {
  id: string
  tokenId: string
  type: TokenType
  role?: Role
  // 过期时间
  exp?: number
  // 签发时间
  iat?: number
}

// const { GqlExecutionContext } = await import('@nestjs/graphql')

export const Me: () => ParameterDecorator = createParamDecorator(
  (data, context: ExecutionContext) => {
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest().user
    }

    // const ctx = GqlExecutionContext.create(context)
    // return ctx.getContext().req.user
    return null
  },
)

export const Token: () => ParameterDecorator = createParamDecorator(
  (data, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest() as Request
    return request.headers['authorization'] // || request.headers['authorization']
      ?.substring(7)
  },
)

export const NeedLogin: () => MethodDecorator & ClassDecorator = () => {
  return applyDecorators(
    ApiBearerAuth(),
    UseGuards(JwtGuard),
    ApiUnauthorizedResponse({
      description: '登录失效',
      type: () => HttpExceptionType,
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    }),
  )
}
export const OptionalLogin: () => MethodDecorator & ClassDecorator = () =>
  applyDecorators(UseGuards(OptionalJwtAuthGuard))

export const NeedAdminLogin: () => MethodDecorator & ClassDecorator = () =>
  applyDecorators(
    ApiCookieAuth('jwt'),
    Roles(Role.ADMIN, Role.SUPER_ADMIN),
    UseGuards(JwtGuard, RolesGuard),
    ApiUnauthorizedResponse({
      description: '登录失效',
      type: () => HttpExceptionType,
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    }),
    ApiForbiddenResponse({
      description: '无权限',
      type: () => HttpExceptionType,
      example: {
        statusCode: 403,
        message: 'Forbidden',
      },
    }),
  )

export const NeedRefreshToken: () => MethodDecorator & ClassDecorator = () => {
  return applyDecorators(
    ApiBearerAuth(),
    UseGuards(AuthGuard('refresh_token')),
    ApiResponse({ status: 401, description: 'refresh_token 无效' }),
  )
}

export const TryAuth: () => MethodDecorator & ClassDecorator = () => {
  return applyDecorators(
    UseGuards(LocalAuthGuard),
    ApiResponse({ status: 401, description: '所有登录方式均未通过' }),
  )
}
