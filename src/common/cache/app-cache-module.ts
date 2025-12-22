import {CacheModule} from '@nestjs/cache-manager'
import {ConfigModule, ConfigService} from '@nestjs/config'
import {BunRedisKeyvAdapter} from './redis/bun-redis-keyv-adapter'

export function createAppCacheModule() {
  return CacheModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      stores: [
        new BunRedisKeyvAdapter(configService.get<string>('REDIS_URL', 'redis://localhost:6379/4'))
      ]
    }),
    isGlobal: true
  })
}
