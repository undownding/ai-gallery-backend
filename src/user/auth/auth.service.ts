import { Inject, Injectable } from '@nestjs/common'
import { nanoid } from 'nanoid'
import { JwtService } from '@nestjs/jwt'
import argon2 from 'argon2'
import { UserService } from '../user.service'
import { IToken, TokenType } from './auth.decorator'
import { User } from '../user.entity'

@Injectable()
export class AuthService {
  @Inject(UserService)
  private readonly userService: UserService

  @Inject(JwtService)
  private readonly jwtService: JwtService

  public async checkUser(username: string, password: string): Promise<boolean> {
    const user = await this.userService.findOne({
      select: ['id', 'username', 'password', 'secret'],
      where: {
        username
      }
    })
    if (!user) {
      return false
    }
    return argon2.verify(user.password, password, {
      secret: Buffer.from(user.secret, 'base64')
    })
  }

  public async sign(user: IToken | User, type: TokenType): Promise<string> {
    const token: IToken = {
      id: user.id,
      tokenId: nanoid(16),
      role: user.role,
      type
    }
    return this.jwtService.sign(token, {
      expiresIn: type === 'refresh_token' ? '90d' : '30d'
    })
  }
}
