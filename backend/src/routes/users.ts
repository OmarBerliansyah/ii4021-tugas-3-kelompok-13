import { Hono } from 'hono'
import { HttpError } from '../lib/http-error'
import { requireAuth } from '../middleware/auth'
import { findPublicUserByEmail, listContacts } from '../services/users'
import type { AppEnv } from '../types/app'

export const userRoutes = new Hono<AppEnv>()

userRoutes.use('*', requireAuth)

userRoutes.get('/contacts', async (c) => {
  const currentUser = c.get('authUser')
  return c.json({ contacts: await listContacts(currentUser.email) })
})

userRoutes.get('/:email/public-key', async (c) => {
  const email = c.req.param('email').toLowerCase()
  const user = await findPublicUserByEmail(email)

  if (!user) {
    throw new HttpError(404, 'user is not registered')
  }

  return c.json({ user })
})
