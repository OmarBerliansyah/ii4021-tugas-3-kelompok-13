import type { IncomingMessage } from 'node:http'
import type { ServerType } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { verifyAuthToken } from '../lib/auth-token'
import { registerConnection, removeConnection } from '../lib/connections'

export const setupWebSocket = (server: ServerType): void => {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

    if (url.pathname !== '/ws') {
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws, req: IncomingMessage) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const token = url.searchParams.get('token') ?? ''

    let userEmail: string | null = null
    try {
      const authUser = verifyAuthToken(token)
      userEmail = authUser.email
    } 
    catch {
    }

    if (!userEmail) {
      ws.send(JSON.stringify({ type: 'error', message: 'unauthorized' }))
      ws.close(4001, 'unauthorized')
      return
    }

    const email = userEmail
    registerConnection(email, ws)
    ws.send(JSON.stringify({ type: 'connected', email }))

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as { type?: unknown }
        if (parsed?.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } 
      catch {
      }
    })

    ws.on('close', () => {
      removeConnection(email)
    })

    ws.on('error', () => {
      removeConnection(email)
    })
  })
}
