import { Controller, Get, Req } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { NeedLogin } from './need-login.decorator'
import { User } from './user.entity'

interface AuthenticatedRequest extends Request {
  user: User
}

@Controller('/users/me')
@ApiTags('Users')
export class UsersMeController {
  @Get()
  @NeedLogin()
  @ApiOperation({ summary: 'Get current logged-in user information' })
  @ApiOkResponse({ type: User })
  getProfile(@Req() req: AuthenticatedRequest): User {
    return req.user
  }
}
