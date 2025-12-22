import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsUUID } from 'class-validator'

export class UpdateAvatarDTO {
  @ApiProperty({
    description: '头像对应的 uploadId',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  uploadId: string
}
