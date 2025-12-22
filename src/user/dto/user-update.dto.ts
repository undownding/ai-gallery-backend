import { PartialType, PickType } from '@nestjs/swagger'
import { User } from '../user.entity'

export class UserUpdateDTO extends PartialType(
  PickType(User, ['username', 'nickname']),
) {}
