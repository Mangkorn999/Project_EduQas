import { FastifyInstance } from 'fastify'
import fastifyCsrf from '@fastify/csrf-protection'

export default async function csrfMiddleware(app: FastifyInstance) {
  await app.register(fastifyCsrf, {
    cookieOpts: { 
      signed: true, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    },
  })
}
