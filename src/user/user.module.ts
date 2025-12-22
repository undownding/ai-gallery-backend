import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './user.entity'
import { AuthService } from './auth/auth.service'
import { JwtGuard } from './auth/guards/auth-jwt.guard'
import { LocalAuthGuard } from './auth/guards/local-auth.guard'
import { RolesGuard } from './auth/guards/role.guard'
import { AuthUsernamePasswordStrategy } from './auth/strategies/auth-username-password.strategy'
import { UserController } from './user.controller'
import { AuthJwtStrategy } from './auth/strategies/auth-jwt.strategy'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { UploadModule } from '../upload/upload.module'
import { AuthRefreshTokenStrategy } from './auth/strategies/auth-refresh-token.strategy'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' }
      })
    }),
    UploadModule
  ],
  providers: [
    UserService,
    AuthService,
    JwtGuard,
    LocalAuthGuard,
    RolesGuard,
    AuthUsernamePasswordStrategy,
    AuthJwtStrategy,
    AuthRefreshTokenStrategy
  ],
  controllers: [UserController],
  exports: [UserService]
})
export class UserModule {}
