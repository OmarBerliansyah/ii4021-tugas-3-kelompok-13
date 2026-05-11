import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { createMessage, listConversationMessages } from '../services/messages'
import type { AppEnv } from '../types'
import { requireEmail, requireString } from '../lib/validation'

export const messageRoutes = new Hono<AppEnv>()

messageRoutes.use('*', requireAuth)

messageRoutes.get('/:contactEmail', async (c) => {
  const currentUser = c.get('authUser')
  const contactEmail = requireEmail(c.req.param('contactEmail'))

  return c.json({
    messages: await listConversationMessages(currentUser.email, contactEmail),
  })
})

messageRoutes.post('/', async (c) => {
  const currentUser = c.get('authUser')
  const body = await c.req.json()
  const receiverEmail = requireEmail(body.receiverEmail)

  const message = await createMessage({
    senderEmail: currentUser.email,
    receiverEmail,
    ciphertext: requireString(body.ciphertext, 'ciphertext', { min: 1 }),
    iv: requireString(body.iv, 'iv', { min: 1 }),
    mac: requireString(body.mac, 'mac', { min: 1 }),
    algorithm:
      typeof body.algorithm === 'string' && body.algorithm.trim() ? body.algorithm : undefined,
    timestamp:
      typeof body.timestamp === 'string' && body.timestamp.trim() ? body.timestamp : undefined,
  })

  return c.json({ message }, 201)
})
