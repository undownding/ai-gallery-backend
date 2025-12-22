import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './user.entity'
import type { StringValue } from 'ms'
import { TokenPayloadDto } from './dto/token-response.dto'

export type TokenType = 'access' | 'refresh'

interface JwtPayload {
  sub: string
  login: string
  type: TokenType
  exp?: number
}

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}

  async issueLoginPayload(user: User): Promise<TokenPayloadDto> {
    const payload = { sub: user.id, login: user.login }

    const accessToken = await this.jwtService.signAsync({ ...payload, type: 'access' })
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      { expiresIn: this.getRefreshExpiresIn() }
    )

    return {
      accessToken,
      accessTokenExpireIn: this.extractExpiration(accessToken),
      refreshToken,
      refreshTokenExpireIn: this.extractExpiration(refreshToken),
      user
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPayloadDto> {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required')
    }

    let payload: JwtPayload
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken)
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token', { cause: error as Error })
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type')
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } })
    if (!user) {
      throw new UnauthorizedException('User no longer exists')
    }

    return this.issueLoginPayload(user)
  }

  private extractExpiration(token: string): number {
    const decoded = this.jwtService.decode(token)
    if (!decoded || typeof decoded !== 'object' || typeof decoded['exp'] !== 'number') {
      throw new InternalServerErrorException('Failed to extract JWT expiration timestamp')
    }

    return decoded['exp'] * 1000
  }

  private getRefreshExpiresIn(): StringValue {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d') as StringValue
  }
}
