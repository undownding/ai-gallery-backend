import { INestApplication, Logger } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import path from 'path'
import { writeFileSync } from 'fs'
import type { NextFunction, Request, Response } from 'express'
import { RapidocModule } from '@b8n/nestjs-rapidoc'

export function setupSwagger(app: INestApplication): void {
  const builder = new DocumentBuilder()
    .setTitle('Bun API Template')
    .setDescription('api template project using bun with nestjs')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, builder)
  try {
    const outputPath = path.resolve(process.cwd(), 'dist', 'swagger.json')
    writeFileSync(outputPath, JSON.stringify(document, null, 2), {
      encoding: 'utf8'
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    Logger.warn('No permission to write swagger.json')
  }

  RapidocModule.setup(`apidoc/`, app, document)

  app.use('/', (req: Request, res: Response, next: NextFunction) => {
    if (req.url === '/') {
      res.redirect(`apidoc/`)
    } else {
      next()
    }
  })
}
