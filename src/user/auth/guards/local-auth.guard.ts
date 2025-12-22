import { AuthGuard } from '@nestjs/passport'

export class LocalAuthGuard extends AuthGuard([
  'username-password',
  // 'phone-code',
  // 'email-password',
  // 'wechat-qrcode',
  // 'lark-code',
]) {}
