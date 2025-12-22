import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import process from 'process'
import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'
import { setupSwagger } from './common/setup-swagger'
import cookieParser from 'cookie-parser'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const configService = app.get(ConfigService)

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  })

  if (configService.get('NODE_ENV') !== 'production' || process.env.VERCEL) {
    setupSwagger(app)
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
    }),
  )

  app.use(cookieParser())

  await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
