import { type TypeOrmModuleAsyncOptions } from '@nestjs/typeorm'
import dotenv from 'dotenv'
import process from 'process'

import { DataSource, type DataSourceOptions, MixedList } from 'typeorm'
import SnakeNamingStrategy from './snake-naming-strategy'
import { createMemDb } from './memdb'

export function createDataSourceOptions(entities?: MixedList<any>): DataSourceOptions {
  dotenv.config({ path: '.env' })
  switch (process.env.NODE_ENV) {
    case 'production':
      return {
        type: 'postgres',
        url: process.env.POSTGRES_URL,
        synchronize: false,
        migrations: ['migrations/*.ts'],
        logging: false
      }
    case 'migration':
      return {
        type: 'postgres',
        url: process.env.POSTGRES_URL,
        synchronize: false,
        logging: true,
        entities: ['dist/**/*.entity.js'],
        migrations: ['src/migrations/*.ts']
      }
    default:
      return {
        type: 'postgres',
        url: process.env.POSTGRES_URL,
        entities,
        migrations: ['migrations/*.ts'],
        synchronize: false,
        logging: true
      }
  }
}

export function createTypeOrmAsyncOptions(entities?: MixedList<any>): TypeOrmModuleAsyncOptions {
  return {
    useFactory: () => createDataSourceOptions(entities),
    dataSourceFactory: async (options: DataSourceOptions) => {
      const defaultOptions = {
        namingStrategy: new SnakeNamingStrategy()
      }
      if (
        options.type === 'postgres' &&
        (process.env.NODE_ENV === 'test' || !process.env.NODE_ENV)
      ) {
        const ds: DataSource = createMemDb().adapters.createTypeormDataSource({
          ...options,
          ...defaultOptions
        })
        await ds.initialize()
        await ds.synchronize()

        return ds
      }
      return new DataSource({ ...options, ...defaultOptions })
    }
  }
}

const appDataSource = new DataSource(createDataSourceOptions(['src/**/*.entity.ts']))
export default appDataSource
