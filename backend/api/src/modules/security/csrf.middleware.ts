import { FastifyInstance } from 'fastify'
import fastifyCsrf from '@fastify/csrf-protection'

export default async function csrfMiddleware(app: FastifyInstance) {
  await app.register(fastifyCsrf, {
    cookieOpts: { 
      signed: true, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      // 'lax' allows the CSRF cookie to survive OAuth redirect (cross-site GET),
      // while still blocking cross-site POST (the actual CSRF vector)
      sameSite: 'lax'
    },
  })
}
