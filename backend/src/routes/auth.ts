import { Hono } from 'hono'
import { login, register } from '../services/auth'
import type { AppEnv } from '../types/app'
import { requireAuth } from '../middleware/auth'
import { requireEmail, requireString } from '../lib/validation'

export const authRoutes = new Hono<AppEnv>()

authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const email = requireEmail(body.email)
    
    const passwordHash = body.password_hash 
      ? requireString(body.password_hash, 'password_hash', { min: 16 })
      : undefined
    
    const passwordSalt = body.password_salt
      ? requireString(body.password_salt, 'password_salt', { min: 8 })
      : undefined

    const password = passwordHash && passwordSalt 
      ? undefined 
      : requireString(body.password, 'password', {
          min: 8,
          max: 256,
        })

    const user = await register({
      email,
      password: password || '',
      publicKey: requireString(body.public_key, 'public_key', { min: 16 }),
      encryptedPrivateKey: requireString(
        body.encrypted_private_key,
        'encrypted_private_key',
        { min: 16 },
      ),
      privateKeyIv: requireString(body.private_key_iv, 'private_key_iv', {
        min: 8,
      }),
      kdfSalt: requireString(body.kdf_salt, 'kdf_salt', { min: 8 }),
      keyAlgorithm:
        typeof body.key_algorithm === 'string' ? body.key_algorithm : undefined,
      keyMetadata:
        body.key_metadata &&
        typeof body.key_metadata === 'object' &&
        !Array.isArray(body.key_metadata)
          ? body.key_metadata
          : undefined,
      passwordHash: passwordHash,
      passwordSalt: passwordSalt,
    })

    return c.json({ user }, 201)
  } catch (err) {
    throw err
  }
})

authRoutes.post('/login', async (c) => {
  const body = await c.req.json()
  const email = requireEmail(body.email)
  const password = requireString(body.password, 'password', {
    min: 1,
    max: 256,
  })

  try {
    const result = await login(email, password)
    return c.json(result)
  } catch (error) {
    throw error
  }
})

authRoutes.get('/me', requireAuth, (c) => {
  return c.json({ user: c.get('authUser') })
})