import { IEventEmitter, KeyvStoreAdapter, StoredData } from 'keyv'
import { RedisClient } from 'bun'

export class BunRedisKeyvAdapter implements KeyvStoreAdapter, IEventEmitter {
  private readonly redisClient: RedisClient

  namespace: string
  opts: any

  constructor(redisUrl: string) {
    this.redisClient = new RedisClient(redisUrl)
  }

  async clear(): Promise<void> {
    await this.redisClient.del('*')
  }

  async delete(key: string): Promise<boolean> {
    return (await this.redisClient.del(key)) === 1
  }

  async deleteMany(key: string[]): Promise<boolean> {
    const deletedCount = await this.redisClient.del(...key)
    return deletedCount === key.length
  }

  async disconnect(): Promise<void> {
    this.redisClient.close()
  }

  async get<Value>(key: string): Promise<StoredData<Value> | undefined> {
    return (await this.redisClient.get(key)) as any
  }

  async getMany<Value>(keys: string[]): Promise<Array<StoredData<Value | undefined>>> {
    return (await this.redisClient.mget(...keys)).map((value) => value as any)
  }

  async has(key: string): Promise<boolean> {
    return this.redisClient.exists(key)
  }

  async hasMany(keys: string[]): Promise<boolean[]> {
    return await Promise.all(keys.map((key) => this.redisClient.exists(key)))
  }

  iterator<Value>(
    namespace?: string
  ): AsyncGenerator<Array<string | Awaited<Value> | undefined>, void> {
    throw new Error('Iterator not implemented.')
  }

  on(event: string, listener: (...arguments_: any[]) => void): IEventEmitter {
    if (event === 'connect') {
      this.redisClient.onconnect = listener
    } else if (event === 'close') {
      this.redisClient.onclose = listener
    }
    return this
  }

  set(key: string, value: any, ttl?: number): any {
    if (ttl) {
      return this.redisClient.setex(key, ttl / 1000, value)
    } else {
      return this.redisClient.set(key, value)
    }
  }

  async setMany(values: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    await Promise.all(values.map(({ key, value, ttl }) => this.set(key, value, ttl)))
  }
}
