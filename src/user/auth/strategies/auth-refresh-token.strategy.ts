import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'
import { Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { IToken } from '../auth.decorator'

@Injectable()
export class AuthRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh_token',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: AuthRefreshTokenStrategy.fromHeader,
      secretOrKey: configService.get('JWT_SECRET', 'badapple'),
    })
  }

  public static fromHeader(req: Request): string | null {
    const [type, token] =
      (req.header('x-authorization') || req.header('Authorization'))?.split(
        ' ',
      ) ?? []
    return type === 'Bearer' ? token : null
  }

  public async validate(payload: IToken): Promise<object> {
    if (payload.type !== 'refresh_token') {
      throw new BadRequestException('token 类型无效')
    }
    return payload
  }
}
