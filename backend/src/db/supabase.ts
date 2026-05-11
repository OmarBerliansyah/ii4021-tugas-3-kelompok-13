import { env } from '../config/env'
import type { QueryParams, RequestOptions } from '../types'

export class SupabaseRestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'SupabaseRestError'
  }
}

const buildUrl = (table: string, query: QueryParams = {}) => {
  const url = new URL(`${env.supabaseUrl}/rest/v1/${table}`)

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url
}

const request = async <T>(table: string, options: RequestOptions = {}) => {
  const response = await fetch(buildUrl(table, options.query), {
    method: options.method ?? 'GET',
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new SupabaseRestError(
      payload?.message ?? 'Supabase request failed',
      response.status,
      payload,
    )
  }

  return payload as T
}

export const supabaseRest = {
  select: <T>(table: string, query: QueryParams = {}) =>
    request<T[]>(table, { query }),

  insert: <T>(table: string, body: unknown) =>
    request<T[]>(table, {
      method: 'POST',
      query: { select: '*' },
      body,
      prefer: 'return=representation',
    }),
}
