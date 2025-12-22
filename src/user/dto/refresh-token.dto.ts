import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class RefreshTokenDto {
  @ApiProperty({ description: 'Previously issued refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string
}
