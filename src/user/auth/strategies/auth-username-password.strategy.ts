import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { AuthService } from '../auth.service'
import { UserService } from '../../user.service'
import { User } from '../../user.entity'

@Injectable()
export class AuthUsernamePasswordStrategy extends PassportStrategy(
  Strategy,
  'username-password',
) {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    })
  }

  async validate(username: string, password: string): Promise<User | null> {
    if (!username || !password) {
      return null
    }
    const user = await this.userService.getByUserName(username)
    const isCorrect = await this.authService.checkUser(username, password)
    if (!isCorrect) {
      throw new UnauthorizedException('登录信息验证失败')
    }
    return user
  }
}
