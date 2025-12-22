import { URL } from 'url'

const redisDefaultPort = 6379
const sentinelDefaultPort = 26379

export interface IRedisUrl {
  database?: string
  host: string
  password?: string
  port: number
}

const predefinedSeparatorRegexp = /,|;|\s/

function preparePassword(auth: string | undefined, encoding?: BufferEncoding): string | undefined {
  if (!auth) {
    return undefined
  }
  return encoding ? Buffer.from(auth, encoding).toString() : auth
}

function prepareResult(v: string, sentinel: boolean, encoding?: BufferEncoding): IRedisUrl {
  // 自动添加协议头
  if (!v.includes('://')) {
    v = 'redis://' + v
  }

  const url = new URL(v)
  const pathname = url.pathname || '/0'

  return {
    database: sentinel
      ? undefined
      : (pathname.startsWith('/') ? pathname.slice(1) : pathname) || '0',
    host: url.hostname || 'localhost',
    password: sentinel
      ? undefined
      : preparePassword(url.password || url.username || undefined, encoding),
    port: Number(url.port || (sentinel ? sentinelDefaultPort : redisDefaultPort))
  }
}

export function parseRedisUrl(
  value?: string,
  sentinel: boolean = false,
  separatorRegexp: RegExp = predefinedSeparatorRegexp,
  encoding?: BufferEncoding
): IRedisUrl[] {
  if (!value) {
    return [
      {
        database: sentinel ? undefined : '0',
        host: 'localhost',
        port: sentinel ? sentinelDefaultPort : redisDefaultPort
      }
    ]
  }

  const result: IRedisUrl[] = []
  const urlValues = value
    .split(separatorRegexp)
    .map((v) => v.trim())
    .filter((v) => v)

  for (const urlValue of urlValues) {
    try {
      result.push(prepareResult(urlValue, sentinel, encoding))
    } catch (e) {
      console.error(`Invalid Redis URL: ${urlValue}`, e)
    }
  }

  return result
}
