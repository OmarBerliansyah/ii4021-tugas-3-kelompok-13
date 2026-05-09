import { HttpError } from '../lib/http-error'
import { supabaseRest } from '../db/supabase'
import { pushToUser } from '../lib/connections'
import type { MessageRow } from '../types/app'
import { getOrCreateConversation } from './conversations'
import { findUserByEmail } from './users'

type CreateMessageInput = {
  senderEmail: string
  receiverEmail: string
  ciphertext: string
  iv: string
  mac: string
  algorithm?: string
  timestamp?: string
}

export const createMessage = async (input: CreateMessageInput) => {
  const receiver = await findUserByEmail(input.receiverEmail)
  if (!receiver) {
    throw new HttpError(404, 'receiver is not registered')
  }

  if (input.senderEmail === input.receiverEmail) {
    throw new HttpError(400, 'receiver must be different from sender')
  }

  await getOrCreateConversation(input.senderEmail, input.receiverEmail)

  const rows = await supabaseRest.insert<MessageRow>('messages', {
    sender_email: input.senderEmail,
    receiver_email: input.receiverEmail,
    ciphertext: input.ciphertext,
    iv: input.iv,
    mac: input.mac,
    algorithm: input.algorithm ?? 'AES-256',
    timestamp: input.timestamp ?? new Date().toISOString(),
  })

  const message = rows[0]

  pushToUser(input.receiverEmail, { type: 'new_message', message })

  return message
}

export const listConversationMessages = async (
  currentEmail: string,
  contactEmail: string,
) => {
  const [sent, received] = await Promise.all([
    supabaseRest.select<MessageRow>('messages', {
      select: '*',
      sender_email: `eq.${currentEmail}`,
      receiver_email: `eq.${contactEmail}`,
      order: 'timestamp.asc',
      limit: 200,
    }),
    supabaseRest.select<MessageRow>('messages', {
      select: '*',
      sender_email: `eq.${contactEmail}`,
      receiver_email: `eq.${currentEmail}`,
      order: 'timestamp.asc',
      limit: 200,
    }),
  ])

  return [...sent, ...received].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  )
}
