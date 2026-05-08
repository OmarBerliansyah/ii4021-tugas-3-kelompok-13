export type JwtAlg = 'ES256' | 'ES384' | 'ES512'

export type AuthUser = {
  id: string
  email: string
}

export type AppEnv = {
  Variables: {
    authUser: AuthUser
  }
}

export type AppUserRow = {
  id: string
  email: string
  password_hash: string
  password_salt: string
  public_key: string
  encrypted_private_key: string
  private_key_iv: string
  kdf_salt: string
  key_algorithm: string
  key_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  sender_email: string
  receiver_email: string
  ciphertext: string
  iv: string
  mac: string | null
  algorithm: string
  timestamp: string
}
