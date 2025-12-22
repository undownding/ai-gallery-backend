import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  // Override this method, so it can be used in graphql
  // 如需要改用 GraphQL，移除下面方法的注释。
  // getRequest(context: ExecutionContext): object {
  //   const ctx = GqlExecutionContext.create(context)
  //   const gqlReq = ctx.getContext().req
  //   if (gqlReq) {
  //     const { variables } = ctx.getArgs()
  //     gqlReq.body = variables
  //     return gqlReq
  //   }
  //   return context.switchToHttp().getRequest()
  // }
}
