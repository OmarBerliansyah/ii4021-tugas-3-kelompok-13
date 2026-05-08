import type { MiddlewareHandler } from 'hono'

export const cors: MiddlewareHandler = async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204)
  }

  await next()
}
