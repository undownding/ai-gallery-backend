import { DataType, type IMemoryDb, newDb } from 'pg-mem'
import { v4 } from 'uuid'

export function createMemDb(): IMemoryDb {
  const memDb = newDb({
    autoCreateForeignKeyIndices: true,
  })

  memDb.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () =>
      'PostgreSQL 15.0 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 10.2.0, 64-bit',
  })

  memDb.public.registerFunction({
    implementation: () => 'test',
    name: 'current_database',
  })

  memDb.registerExtension('uuid-ossp', (schema) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.uuid,
      implementation: v4,
      impure: true,
    })
  })

  return memDb
}
