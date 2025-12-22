import { ApiProperty } from '@nestjs/swagger'
import { User } from '../user.entity'

export class TokenPayloadDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string

  @ApiProperty({ description: 'Access token expiration timestamp in milliseconds since epoch' })
  accessTokenExpireIn!: number

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken!: string

  @ApiProperty({ description: 'Refresh token expiration timestamp in milliseconds since epoch' })
  refreshTokenExpireIn!: number

  @ApiProperty({ type: () => User })
  user!: User
}
