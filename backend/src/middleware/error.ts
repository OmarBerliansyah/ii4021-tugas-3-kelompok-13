import type { ErrorHandler } from 'hono'
import { isHttpError } from '../lib/http-error'
import { SupabaseRestError } from '../db/supabase'

export const errorHandler: ErrorHandler = (error, c) => {
  if (isHttpError(error)) {
    return c.json({ error: error.message }, error.status as never)
  }

  if (error instanceof SupabaseRestError) {
    return c.json(
      {
        error: 'database request failed',
        detail: error.message,
        meta: error.details,
      },
      (error.status >= 400 && error.status < 600 ? error.status : 500) as never,
    )
  }

  console.error(error)
  return c.json({ error: 'internal server error' }, 500)
}
