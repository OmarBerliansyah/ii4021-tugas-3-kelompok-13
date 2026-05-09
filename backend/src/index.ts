import { Hono } from 'hono'
import { assertSupabaseEnv } from './config/env'
import { cors } from './middleware/cors'
import { errorHandler } from './middleware/error'
import { authRoutes } from './routes/auth'
import { conversationRoutes } from './routes/conversations'
import { messageRoutes } from './routes/messages'
import { userRoutes } from './routes/users'
import { websocket, wsRoutes } from './routes/websocket'
import type { AppEnv } from './types/app'

assertSupabaseEnv()

const app = new Hono<AppEnv>()

app.onError(errorHandler)
app.use('*', cors)

app.get('/', (c) => {
  return c.json({
    name: 'II4021 Secure Chat Backend',
    status: 'ok',
  })
})

app.route('/auth', authRoutes)
app.route('/users', userRoutes)
app.route('/conversations', conversationRoutes)
app.route('/messages', messageRoutes)
app.route('/ws', wsRoutes)

export default {
  fetch: app.fetch,
  websocket,
}
