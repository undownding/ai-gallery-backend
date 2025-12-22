import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PassportModule } from '@nestjs/passport'
import { User } from './user.entity'
import { GithubLoginController } from './github-login.controller'
import { GithubLoginService } from './github-login.service'
import { AuthTokenService } from './auth-token.service'
import { TokenController } from './token.controller'
import { UsersMeController } from './users-me.controller'
import { JwtStrategy } from './jwt.strategy'
import { JwtAuthGuard } from './jwt-auth.guard'

@Module({
  imports: [TypeOrmModule.forFeature([User]), PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [GithubLoginController, TokenController, UsersMeController],
  providers: [GithubLoginService, AuthTokenService, JwtStrategy, JwtAuthGuard]
})
export class UserModule {}
