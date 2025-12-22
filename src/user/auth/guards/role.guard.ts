import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '../../role.enum'
import { IToken } from '../auth.decorator'

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass()
    ])
    if (!roles) {
      return true
    }
    const request = context.switchToHttp().getRequest()
    const user: IToken = request.user
    return roles.some((role) => user?.role === role)
  }
}
