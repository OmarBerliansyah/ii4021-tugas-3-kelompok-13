import type { AuthUser } from './auth'

export type AppEnv = {
  Variables: {
    authUser: AuthUser
  }
}