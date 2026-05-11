import type { MiddlewareHandler } from 'hono'
import { verifyAuthToken } from '../lib/auth-token'
import { HttpError } from '../lib/http-error'
import type { AppEnv } from '../types'

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    throw new HttpError(401, 'missing bearer token')
  }

  try {
    c.set('authUser', verifyAuthToken(match[1]))
    await next()
  } catch (error) {
    throw new HttpError(
      401,
      error instanceof Error ? error.message : 'invalid token',
    )
  }
}
