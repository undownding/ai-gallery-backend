import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthTokenService } from './auth-token.service'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { TokenPayloadDto } from './dto/token-response.dto'

@Controller('/auth/token')
@ApiTags('Auth Token')
export class TokenController {
  constructor(private readonly authTokenService: AuthTokenService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access/refresh tokens with a valid refresh token' })
  @ApiOkResponse({ description: 'Newly issued token pair and user info', type: TokenPayloadDto })
  refreshTokens(@Body() body: RefreshTokenDto): Promise<TokenPayloadDto> {
    return this.authTokenService.refreshTokens(body.refreshToken)
  }
}
