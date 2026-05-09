import { Hono } from 'hono'
import { upgradeWebSocket, websocket } from 'hono/bun'
import { verifyAuthToken } from '../lib/auth-token'
import { registerConnection, removeConnection } from '../lib/connections'
import type { AppEnv } from '../types/app'

export { websocket }

export const wsRoutes = new Hono<AppEnv>()

wsRoutes.get(
  '/',
  upgradeWebSocket((c) => {
    const token = c.req.query('token') ?? ''

    let userEmail: string | null = null
    try {
      const authUser = verifyAuthToken(token)
      userEmail = authUser.email
    } 
    catch {
    }

    return {
      onOpen(_event, ws) {
        if (!userEmail) {
          ws.send(JSON.stringify({ type: 'error', message: 'unauthorized' }))
          ws.close(4001, 'unauthorized')
          return
        }

        registerConnection(userEmail, ws)
        ws.send(JSON.stringify({ type: 'connected', email: userEmail }))
      },

      onMessage(event, ws) {
        try {
          const data = JSON.parse(String(event.data))
          if (data?.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
          }
        } 
        catch {
        }
      },

      onClose() {
        if (userEmail) {
          removeConnection(userEmail)
        }
      },

      onError() {
        if (userEmail) {
          removeConnection(userEmail)
        }
      },
    }
  }),
)
