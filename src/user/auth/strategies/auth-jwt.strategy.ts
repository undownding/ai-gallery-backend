import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { IToken } from '../auth.decorator'

@Injectable()
export class AuthJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: AuthJwtStrategy.fromCookieOrHeader,
      secretOrKey: configService.get('JWT_SECRET', 'badapple')
    })
  }

  public static fromCookieOrHeader(req: Request): string | null {
    const authHeader = req.header('x-authorization') || req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7, authHeader.length)
    }
    if (req.cookies) {
      return req.cookies['access_token']
    }
    return null
  }

  public async validate(payload: IToken): Promise<IToken> {
    if (payload.type !== 'access_token') {
      throw new BadRequestException('token 类型无效')
    }
    return payload
  }
}
