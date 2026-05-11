export type RegisterInput = {
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

export type RegisterUserInput = {
  email: string
  passwordHash: string
  passwordSalt: string
  publicKey: string
  encryptedPrivateKey: string
  privateKeyIv: string
  kdfSalt: string
  keyAlgorithm?: string
  keyMetadata?: Record<string, unknown>
}

export type AuthUser = {
  id: string
  email: string
}

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthResponse = {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
  user: {
    id: string
    email: string
    publicKey: string
    encryptedPrivateKey: string
    privateKeyIv: string
    kdfSalt: string
    keyAlgorithm: string
    keyMetadata: Record<string, unknown>
  }
}