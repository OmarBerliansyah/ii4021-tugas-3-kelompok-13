import { SupabaseRestError, supabaseRest } from '../db/supabase'
import { HttpError } from '../lib/http-error'
import type { ConversationRow } from '../types/app'

export const normalizeConversationUsers = (emailA: string, emailB: string) => {
  if (emailA === emailB) {
    throw new HttpError(400, 'conversation users must be different')
  }

  return emailA < emailB
    ? { userAEmail: emailA, userBEmail: emailB }
    : { userAEmail: emailB, userBEmail: emailA }
}

export const findConversation = async (emailA: string, emailB: string) => {
  const { userAEmail, userBEmail } = normalizeConversationUsers(emailA, emailB)
  const conversations = await supabaseRest.select<ConversationRow>(
    'conversations',
    {
      select: '*',
      user_a_email: `eq.${userAEmail}`,
      user_b_email: `eq.${userBEmail}`,
      limit: 1,
    },
  )

  return conversations[0] ?? null
}

export const getOrCreateConversation = async (
  emailA: string,
  emailB: string,
) => {
  const existing = await findConversation(emailA, emailB)
  if (existing) {
    return existing
  }

  const { userAEmail, userBEmail } = normalizeConversationUsers(emailA, emailB)

  try {
    const rows = await supabaseRest.insert<ConversationRow>('conversations', {
      user_a_email: userAEmail,
      user_b_email: userBEmail,
    })

    return rows[0]
  } catch (error) {
    if (error instanceof SupabaseRestError && error.status === 409) {
      const conversation = await findConversation(emailA, emailB)
      if (conversation) {
        return conversation
      }
    }

    throw error
  }
}

export const listUserConversations = async (email: string) =>
  supabaseRest.select<ConversationRow>('conversations', {
    select: '*',
    or: `(user_a_email.eq.${email},user_b_email.eq.${email})`,
    order: 'created_at.desc',
  })
