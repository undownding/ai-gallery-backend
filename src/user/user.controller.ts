import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Patch,
  Post,
  Res,
  UnauthorizedException
} from '@nestjs/common'

import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import MyPromise from '@undownding/promise'
import { HttpStatusCode } from 'axios'
import moment from 'moment'
import { User } from './user.entity'
import { type IToken, Me, NeedLogin, NeedRefreshToken, Token, TryAuth } from './auth/auth.decorator'
import { ApiSummary } from '../common/nestjs-ext'
import { UpdateAvatarDTO } from './dto/update-avatar.dto'
import { UserUpdateDTO } from './dto/user-update.dto'
import { AuthService } from './auth/auth.service'
import { UserService } from './user.service'
import { UserDto, UserLoginDTO, UserLoginRespDTO } from './dto/user.login.dto'

@Controller('user')
@ApiTags('用户/登录相关')
export class UserController {
  @Inject(AuthService)
  private readonly authService: AuthService

  @Inject(UserService)
  private readonly userService: UserService

  @Post('login')
  @TryAuth()
  @ApiSummary('登录')
  @ApiOkResponse({
    type: UserLoginRespDTO,
    description: '登录成功'
  })
  @HttpCode(HttpStatusCode.Ok)
  async signIn(
    @Body() body: UserLoginDTO,
    @Me() me: User, // 在使用 @TryAuth 时 @Me 为 User 类型，其他用 @NeedLogin 时用 IToken 类型
    @Res() res: Response
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, secret, ...user } = me
    const resp: UserLoginRespDTO = await MyPromise.props({
      id: user.id,
      user,
      accessToken: this.authService.sign(me, 'access_token'),
      accessTokenExpiredAt: moment().add(30, 'days').toDate(), // 7d
      refreshToken: this.authService.sign(me, 'refresh_token'),
      refreshTokenExpiredAt: moment().add(90, 'days').toDate() // 30d
    })
    res.cookie('access_token', resp.accessToken)
    res.cookie('SamSite', 'None')
    res.json(resp)
  }

  @ApiSummary('已登录用户获取自己信息')
  @ApiOkResponse({ type: () => UserDto })
  @NeedLogin()
  @Get('me')
  async me(@Me() me: IToken): Promise<User | null> {
    return this.userService.getById(me.id)
  }

  @ApiSummary('已登录用户更新自己的头像')
  @ApiOkResponse({ type: () => UserDto })
  @NeedLogin()
  @Patch('me/avatar')
  async setAvatar(@Me() me: IToken, @Body() { uploadId }: UpdateAvatarDTO): Promise<User> {
    return this.userService.setAvatar(me.id, uploadId)
  }

  @ApiSummary('更新我的信息')
  @ApiOkResponse({ type: () => UserDto })
  @ApiConflictResponse({ description: '更新失败，用户名已被占用' })
  @NeedLogin()
  @Patch('me')
  async updateMe(@Me() me: IToken, @Body() body: UserUpdateDTO): Promise<User | null> {
    await this.userService.updateById(me.id, body)
    return this.userService.getById(me.id)
  }

  @Post('token')
  @NeedRefreshToken()
  @ApiOperation({
    summary: '刷新令牌',
    description:
      '当 access_token 过期时，使用 refresh_token 刷新 access_token（需要在 header 中携带 refresh_token）'
  })
  @ApiOkResponse({
    type: UserLoginRespDTO,
    description: '刷新令牌成功'
  })
  async refreshToken(
    @Me() me: IToken, // 此处的 me 为 refreshToken 携带的内容
    @Token() rawToken: string,
    @Res() res: Response
  ): Promise<void> {
    const user = await this.userService.getById(me.id)
    if (!user) {
      throw new UnauthorizedException()
    }
    const resp: UserLoginRespDTO = await MyPromise.props({
      id: user.id,
      user,
      accessToken: this.authService.sign(me, 'access_token'),
      accessTokenExpiredAt: moment().add(30, 'days').toDate(), // 7d
      refreshToken: this.authService.sign(me, 'refresh_token'),
      refreshTokenExpiredAt: moment().add(90, 'days').toDate() // 30d
    })

    res.cookie('access_token', resp.accessToken)
    res.cookie('SamSite', 'None')
    res.json(resp)
  }
}
