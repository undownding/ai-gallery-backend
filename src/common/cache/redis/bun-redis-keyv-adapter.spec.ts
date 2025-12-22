import Keyv from 'keyv'
import { BunRedisKeyvAdapter } from './bun-redis-keyv-adapter'

describe('Keyv on Bun redis', () => {
  const keyv = new Keyv(new BunRedisKeyvAdapter('redis://localhost:6379'))

  it('should get and set a string', async () => {
    await keyv.set('foo', 'bar')
    const value = await keyv.get('foo')
    expect(value).toBe('bar')
  })

  it('should get and set a number', async () => {
    await keyv.set('num', 123)
    const value = await keyv.get<number>('num')
    expect(value).toBe(123)
  })

  it('should get and set a boolean', async () => {
    await keyv.set('bool', true)
    const value = await keyv.get<boolean>('bool')
    expect(value).toBe(true)
  })

  interface MyStruct {
    a: number
    b: string
  }

  it('should get and set a custom struct', async () => {
    const struct: MyStruct = { a: 1, b: 'test' }
    await keyv.set('struct', struct)
    const value = await keyv.get<MyStruct>('struct')
    expect(value).toEqual(struct)
  })
})
