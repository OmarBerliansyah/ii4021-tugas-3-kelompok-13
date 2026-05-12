import type { WebSocket } from 'ws'

const connections = new Map<string, Set<WebSocket>>()

export const registerConnection = (email: string, ws: WebSocket): void => {
  const userConnections = connections.get(email) ?? new Set<WebSocket>()
  userConnections.add(ws)
  connections.set(email, userConnections)
}

export const removeConnection = (email: string, ws?: WebSocket): void => {
  if (!ws) {
    connections.delete(email)
    return
  }

  const userConnections = connections.get(email)
  if (!userConnections) return

  userConnections.delete(ws)
  if (userConnections.size === 0) {
    connections.delete(email)
  }
}

export const isOnline = (email: string): boolean => {
  const userConnections = connections.get(email)
  if (!userConnections) return false

  for (const socket of userConnections) {
    if (socket.readyState === socket.OPEN) {
      return true
    }
  }

  return false
}

export const pushToUser = (email: string, data: unknown): void => {
  const userConnections = connections.get(email)
  if (!userConnections) return

  for (const ws of userConnections) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data))
      continue
    }

    userConnections.delete(ws)
  }

  if (userConnections.size === 0) {
    connections.delete(email)
  }
}
