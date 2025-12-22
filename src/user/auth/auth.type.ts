import { ApiProperty } from '@nestjs/swagger'

export class HttpExceptionType {
  @ApiProperty({
    description: '状态码'
  })
  statusCode: number

  @ApiProperty({
    description: '错误信息',
    type: String,
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }]
  })
  message: string
}
