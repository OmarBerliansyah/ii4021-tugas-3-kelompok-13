import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { assertSupabaseEnv } from './config/env'
import { cors } from './middleware/cors'
import { errorHandler } from './middleware/error'
import { authRoutes } from './routes/auth'
import { conversationRoutes } from './routes/conversations'
import { messageRoutes } from './routes/messages'
import { userRoutes } from './routes/users'
import { setupWebSocket } from './routes/websocket'
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

const port = Number(process.env.PORT) || 3000
console.log(`Server is running on port ${port}`)

const server = serve({ fetch: app.fetch, port })
setupWebSocket(server)