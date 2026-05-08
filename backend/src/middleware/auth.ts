import type { MiddlewareHandler } from 'hono'
import { env } from '../config/env'
import { HttpError } from '../lib/http-error'
import { verify } from '../lib/jwt'
import type { AppEnv } from '../types/app'

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  const match = header.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    throw new HttpError(401, 'missing bearer token')
  }

  try {
    const decoded = verify(match[1], env.jwtPublicKeyPem, {
      algs: [env.jwtAlg],
      iss: env.jwtIssuer,
      aud: env.jwtAudience,
    })

    const sub = decoded.payload.sub
    const email = decoded.payload.email
    if (typeof sub !== 'string' || typeof email !== 'string') {
      throw new Error('JWT subject or email is missing')
    }

    c.set('authUser', { id: sub, email })
    await next()
  } catch (error) {
    throw new HttpError(
      401,
      error instanceof Error ? error.message : 'invalid token',
    )
  }
}
