import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-custom'

@Injectable()
export class EmptyUserStrategy extends PassportStrategy(
  Strategy,
  'empty-user',
) {
  async validate(): Promise<any> {
    return { id: null }
  }
}
