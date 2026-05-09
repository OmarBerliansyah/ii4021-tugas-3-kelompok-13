import type { WSContext } from 'hono/ws'

const connections = new Map<string, WSContext>()

export const registerConnection = (email: string, ws: WSContext): void => {
  connections.set(email, ws)
}

export const removeConnection = (email: string): void => {
  connections.delete(email)
}

export const isOnline = (email: string): boolean => connections.has(email)

export const pushToUser = (email: string, data: unknown): void => {
  const ws = connections.get(email)
  if (ws) {
    ws.send(JSON.stringify(data))
  }
}
