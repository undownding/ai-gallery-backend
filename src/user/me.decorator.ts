import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const Me: () => ParameterDecorator = createParamDecorator(
  (data, context: ExecutionContext) => {
    if (context.getType() === 'http') {
      return context.switchToHttp().getRequest().user
    }

    // const ctx = GqlExecutionContext.create(context)
    // return ctx.getContext().req.user
    return null
  }
)
