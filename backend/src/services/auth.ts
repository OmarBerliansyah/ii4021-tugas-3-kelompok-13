import { env } from '../config/env'
import { hashPassword, randomBase64Url, verifyPassword } from '../lib/crypto'
import { HttpError } from '../lib/http-error'
import { sign } from '../lib/jwt'
import { createUser, findUserByEmail } from './users'

type RegisterInput = {
  email: string
  password: string
  publicKey: string
  encryptedPrivateKey: string
  privateKeyIv: string
  kdfSalt: string
  keyAlgorithm?: string
  keyMetadata?: Record<string, unknown>
  passwordHash?: string
  passwordSalt?: string
}

export const register = async (input: RegisterInput) => {
  const existing = await findUserByEmail(input.email)
  if (existing) {
    throw new HttpError(409, 'email is already registered')
  }

  let hash: string
  let salt: string
  
  if (input.passwordHash && input.passwordSalt) {
    hash = input.passwordHash
    salt = input.passwordSalt
  } else if (input.password) {
    const result = hashPassword(input.password)
    hash = result.hash
    salt = result.salt
  } else {
    throw new HttpError(400, 'password or passwordHash is required')
  }

  const user = await createUser({
    email: input.email,
    passwordHash: hash,
    passwordSalt: salt,
    publicKey: input.publicKey,
    encryptedPrivateKey: input.encryptedPrivateKey,
    privateKeyIv: input.privateKeyIv,
    kdfSalt: input.kdfSalt,
    keyAlgorithm: input.keyAlgorithm,
    keyMetadata: input.keyMetadata,
  })

  return {
    id: user.id,
    email: user.email,
    publicKey: user.public_key,
    createdAt: user.created_at,
  }
}

export const login = async (email: string, password: string) => {
  const user = await findUserByEmail(email)
  
  if (!user) {
    throw new HttpError(401, 'invalid email or password')
  }

  const isValid = verifyPassword(password, user.password_hash, user.password_salt)

  if (!isValid) {
    throw new HttpError(401, 'invalid email or password')
  }

  const now = Math.floor(Date.now() / 1000)
  const token = sign(
    { alg: env.jwtAlg, typ: 'JWT' },
    {
      iss: env.jwtIssuer,
      aud: env.jwtAudience,
      sub: user.id,
      iat: now,
      nbf: now,
      exp: now + env.jwtExpiresInSeconds,
      jti: randomBase64Url(16),
    },
    { email: user.email },
    env.jwtPrivateKeyPem,
  )

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: env.jwtExpiresInSeconds,
    user: {
      id: user.id,
      email: user.email,
      publicKey: user.public_key,
      encryptedPrivateKey: user.encrypted_private_key,
      privateKeyIv: user.private_key_iv,
      kdfSalt: user.kdf_salt,
      keyAlgorithm: user.key_algorithm,
      keyMetadata: user.key_metadata,
    },
  }
}