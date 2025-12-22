import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import axios from 'axios'
import { User } from './user.entity'
import { AuthTokenService } from './auth-token.service'
import { TokenPayloadDto } from './dto/token-response.dto'

interface GithubUserPayload {
  id: number
  login: string
  name?: string | null
  email?: string | null
  avatar_url?: string | null
}

interface GithubEmailPayload {
  email: string
  primary: boolean
  verified: boolean
}

@Injectable()
export class GithubLoginService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly authTokenService: AuthTokenService
  ) {}

  buildAuthorizeUrl(state?: string, redirectUriOverride?: string): string {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')
    if (!clientId) {
      throw new InternalServerErrorException('GitHub OAuth client id is not configured')
    }

    const baseAuthorizeUrl = this.configService.get<string>(
      'GITHUB_AUTHORIZE_URL',
      'https://github.com/login/oauth/authorize'
    )
    const scope = this.configService.get<string>('GITHUB_SCOPE', 'read:user user:email')
    const redirectUri = redirectUriOverride ?? this.configService.get<string>('GITHUB_REDIRECT_URI')
    const authorizeUrl = new URL(baseAuthorizeUrl)

    authorizeUrl.searchParams.set('client_id', clientId)
    if (redirectUri) {
      authorizeUrl.searchParams.set('redirect_uri', redirectUri)
    }
    if (scope) {
      authorizeUrl.searchParams.set('scope', scope)
    }
    if (state) {
      authorizeUrl.searchParams.set('state', state)
    }

    return authorizeUrl.toString()
  }

  async exchangeCodeForSession(code: string): Promise<TokenPayloadDto> {
    if (!code) {
      throw new BadRequestException('Missing "code" query parameter')
    }
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('GitHub OAuth credentials are not configured')
    }

    const tokenUrl = this.configService.get<string>(
      'GITHUB_TOKEN_URL',
      'https://github.com/login/oauth/access_token'
    )

    const tokenPayload: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code
    }

    let tokenResponse
    try {
      tokenResponse = await axios.post(tokenUrl, tokenPayload, {
        headers: { Accept: 'application/json' }
      })
    } catch (error) {
      throw new UnauthorizedException('GitHub token exchange failed', { cause: error as Error })
    }

    const accessToken = tokenResponse.data?.access_token as string | undefined
    if (!accessToken) {
      throw new UnauthorizedException('Failed to retrieve GitHub access token')
    }

    const profile = await this.fetchGithubProfile(accessToken)
    const user = await this.upsertUser(profile)

    return this.authTokenService.issueLoginPayload(user)
  }

  private async fetchGithubProfile(accessToken: string): Promise<GithubUserPayload> {
    try {
      const profileResponse = await axios.get<GithubUserPayload>('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'ai-gallery-backend'
        }
      })

      const profile = profileResponse.data
      if (!profile?.id || !profile?.login) {
        throw new UnauthorizedException('Incomplete GitHub profile data')
      }

      if (!profile.email) {
        profile.email = await this.fetchPrimaryEmail(accessToken)
      }

      return profile
    } catch (error) {
      throw new UnauthorizedException('Unable to fetch GitHub profile', { cause: error as Error })
    }
  }

  private async fetchPrimaryEmail(accessToken: string): Promise<string | null> {
    try {
      const emailResponse = await axios.get<GithubEmailPayload[]>(
        'https://api.github.com/user/emails',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'ai-gallery-backend'
          }
        }
      )

      const email = emailResponse.data.find((item) => item.primary && item.verified)
      return email?.email ?? emailResponse.data.find((item) => item.verified)?.email ?? null
    } catch {
      return null
    }
  }

  private async upsertUser(profile: GithubUserPayload): Promise<User> {
    const githubId = String(profile.id)
    const now = new Date()
    const existingUser = await this.userRepository.findOne({ where: { githubId } })

    if (!existingUser) {
      const created = this.userRepository.create({
        githubId,
        login: profile.login,
        name: profile.name ?? null,
        email: profile.email ?? null,
        avatarUrl: profile.avatar_url ?? null,
        lastLoginAt: now
      })

      return this.userRepository.save(created)
    }

    existingUser.login = profile.login ?? existingUser.login
    existingUser.name = profile.name ?? existingUser.name
    existingUser.avatarUrl = profile.avatar_url ?? existingUser.avatarUrl
    existingUser.lastLoginAt = now

    if (profile.email) {
      existingUser.email = profile.email
    }

    return this.userRepository.save(existingUser)
  }
}
