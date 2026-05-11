import { supabaseRest } from '../db/supabase'
import type { AppUserRow, PublicUserInfo, RegisterUserInput } from '../types'

const PUBLIC_USER_COLUMNS =
  'id,email,public_key,key_algorithm,key_metadata,created_at'

export const findUserByEmail = async (email: string) => {
  const users = await supabaseRest.select<AppUserRow>('users', {
    select: '*',
    email: `eq.${email}`,
    limit: 1,
  })

  return users[0] ?? null
}

export const createUser = async (input: RegisterUserInput) => {
  const rows = await supabaseRest.insert<AppUserRow>('users', {
    email: input.email,
    password_hash: input.passwordHash,
    password_salt: input.passwordSalt,
    public_key: input.publicKey,
    encrypted_private_key: input.encryptedPrivateKey,
    private_key_iv: input.privateKeyIv,
    kdf_salt: input.kdfSalt,
    key_algorithm: input.keyAlgorithm ?? 'ECDH-P-256',
    key_metadata: input.keyMetadata ?? {},
  })

  return rows[0]
}

export const listContacts = async (currentEmail: string) =>
  supabaseRest.select<PublicUserInfo>('users', {
    select: PUBLIC_USER_COLUMNS,
    email: `neq.${currentEmail}`,
    order: 'email.asc',
  })

export const findPublicUserByEmail = async (email: string) => {
  const users = await supabaseRest.select<PublicUserInfo>('users', {
    select: PUBLIC_USER_COLUMNS,
    email: `eq.${email}`,
    limit: 1,
  })

  return users[0] ?? null
}
