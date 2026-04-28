import 'fastify'

import type { AccessTokenPayload } from '../modules/auth/token.service'

declare module 'fastify' {
  interface FastifyJwtNamespace {
    jwt: unknown
  }

  interface FastifyRequest {
    jwtVerify(): Promise<void>
    cookies: Record<string, string | undefined>
    user: AccessTokenPayload
  }

  interface FastifyReply {
    setCookie(name: string, value: string, options?: Record<string, unknown>): FastifyReply
    clearCookie(name: string, options?: Record<string, unknown>): FastifyReply
  }

  interface FastifyInstance {
    jwt: {
      sign(payload: AccessTokenPayload, options?: { expiresIn?: string }): string
      verify<T>(token: string): T
    }
  }
}
