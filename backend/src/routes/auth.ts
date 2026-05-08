import { Hono } from 'hono'
import { login, register } from '../services/auth'
import type { AppEnv } from '../types/app'
import { requireAuth } from '../middleware/auth'
import { requireEmail, requireString } from '../lib/validation'

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/register', async (c) => {
  const body = await c.req.json()
  const email = requireEmail(body.email)
  const password = requireString(body.password, 'password', {
    min: 8,
    max: 256,
  })

  const user = await register({
    email,
    password,
    publicKey: requireString(body.publicKey, 'publicKey', { min: 16 }),
    encryptedPrivateKey: requireString(
      body.encryptedPrivateKey,
      'encryptedPrivateKey',
      { min: 16 },
    ),
    privateKeyIv: requireString(body.privateKeyIv, 'privateKeyIv', {
      min: 8,
    }),
    kdfSalt: requireString(body.kdfSalt, 'kdfSalt', { min: 8 }),
    keyAlgorithm:
      typeof body.keyAlgorithm === 'string' ? body.keyAlgorithm : undefined,
    keyMetadata:
      body.keyMetadata &&
      typeof body.keyMetadata === 'object' &&
      !Array.isArray(body.keyMetadata)
        ? body.keyMetadata
        : undefined,
  })

  return c.json({ user }, 201)
})

authRoutes.post('/login', async (c) => {
  const body = await c.req.json()
  const email = requireEmail(body.email)
  const password = requireString(body.password, 'password', {
    min: 1,
    max: 256,
  })

  return c.json(await login(email, password))
})

authRoutes.get('/me', requireAuth, (c) => {
  return c.json({ user: c.get('authUser') })
})
