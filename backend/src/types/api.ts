export type QueryParams = Record<string, string | number | boolean | undefined>

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: QueryParams
  body?: unknown
  prefer?: string
}

export type CreateMessageInput = {
  senderEmail: string
  receiverEmail: string
  ciphertext: string
  iv: string
  mac: string
  algorithm?: string
  timestamp?: string
}

export type WebSocketMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'connected'; email: string }
  | { type: 'error'; message: string }
  | { type: 'new_message'; message: unknown }
