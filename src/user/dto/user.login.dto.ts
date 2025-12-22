import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { User } from '../user.entity'

export class UserDto extends OmitType(User, ['password', 'secret', 'setAvatarUrl']) {}

export class UserLoginDTO {
  @ApiProperty({
    description: '用户名',
    example: 'admin'
  })
  @IsString()
  username: string

  @ApiProperty({
    description: '密码',
    example: 'admin'
  })
  @IsString()
  password: string
}

export class UserLoginRespDTO {
  @ApiProperty({
    description: '用户 ID',
    example: '1'
  })
  id: string
  @ApiProperty()
  accessToken: string

  @ApiProperty()
  accessTokenExpiredAt: Date

  @ApiProperty()
  refreshToken: string

  @ApiProperty()
  refreshTokenExpiredAt: Date

  @ApiProperty({
    type: () => UserDto
  })
  user: UserDto
}
