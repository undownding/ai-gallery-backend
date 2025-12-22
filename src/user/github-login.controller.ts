import { Controller, Get, HttpCode, HttpStatus, Post, Query, Redirect } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { GithubLoginService } from './github-login.service'
import { GithubCallbackQueryDto, GithubRedirectQueryDto } from './dto/github-query.dto'
import { TokenPayloadDto } from './dto/token-response.dto'

@Controller('/auth/github')
@ApiTags('GitHub OAuth')
export class GithubLoginController {
  constructor(private readonly githubLoginService: GithubLoginService) {}

  @Get()
  @Redirect()
  @ApiOperation({ summary: 'Redirect user to GitHub authorization page' })
  redirectToGithub(@Query() query: GithubRedirectQueryDto) {
    const { state, redirectUri } = query
    const url = this.githubLoginService.buildAuthorizeUrl(state, redirectUri)
    return { url }
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle GitHub OAuth callback and issue JWT token pair' })
  @ApiOkResponse({ description: 'Authenticated session payload', type: TokenPayloadDto })
  handleCallback(@Query() query: GithubCallbackQueryDto): Promise<TokenPayloadDto> {
    const { code } = query
    return this.githubLoginService.exchangeCodeForSession(code)
  }
}
