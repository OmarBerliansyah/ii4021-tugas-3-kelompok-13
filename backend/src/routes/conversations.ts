import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { listUserConversations } from '../services/conversations'
import type { AppEnv } from '../types'

export const conversationRoutes = new Hono<AppEnv>()

conversationRoutes.use('*', requireAuth)

conversationRoutes.get('/', async (c) => {
  const currentUser = c.get('authUser')

  return c.json({
    conversations: await listUserConversations(currentUser.email),
  })
})
