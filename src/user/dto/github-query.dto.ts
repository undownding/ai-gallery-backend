import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

class GithubBaseQueryDto {
  @ApiPropertyOptional({ description: 'Opaque state value echoed back by GitHub' })
  @IsOptional()
  @IsString()
  state?: string

  @ApiPropertyOptional({
    description: 'Override the default callback URL registered with GitHub',
    name: 'redirect_uri'
  })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => value ?? obj.redirect_uri ?? obj.redirectUri, {
    toClassOnly: true
  })
  redirectUri?: string
}

export class GithubRedirectQueryDto extends GithubBaseQueryDto {}

export class GithubCallbackQueryDto {
  @ApiProperty({ description: 'GitHub authorization code exchanged for an access token' })
  @IsString()
  @IsNotEmpty()
  code!: string
}
