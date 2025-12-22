import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtGuard } from './guards/auth-jwt.guard'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { RolesGuard } from './guards/role.guard'
import { AuthUsernamePasswordStrategy } from './strategies/auth-username-password.strategy'
import { AuthJwtStrategy } from './strategies/auth-jwt.strategy'
import { AuthRefreshTokenStrategy } from './strategies/auth-refresh-token.strategy'
import { AuthService } from './auth.service'
import { UserService } from '../user.service'
import { User } from '../user.entity'
import { UploadModule } from '../../upload/upload.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UploadModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'badapple'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [
    UserService,
    AuthService,
    JwtGuard,
    LocalAuthGuard,
    RolesGuard,
    AuthUsernamePasswordStrategy,
    AuthJwtStrategy,
    AuthRefreshTokenStrategy,
  ],
  exports: [
    UserService,
    AuthService,
    JwtGuard,
    LocalAuthGuard,
    RolesGuard,
    AuthUsernamePasswordStrategy,
    AuthJwtStrategy,
    AuthRefreshTokenStrategy,
  ],
})
export class AuthModule {}
