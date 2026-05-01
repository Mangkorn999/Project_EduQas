import { FastifyInstance } from 'fastify'
import { AuthController } from './auth.controller'
import { meResponseSchema, setRoleSchema } from './auth.schema'
import { env } from '../../config/env'

export default async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController(app)

  // OAuth entry points
  app.get('/psu', controller.initiateOAuth)
  app.get('/callback', controller.callback)

  // Session management
  app.post('/refresh', controller.refresh)
  app.post('/logout', { preHandler: [app.authenticate] }, controller.logout)
  app.get('/me', {
    preHandler: [app.authenticate],
    schema: { response: { 200: meResponseSchema } },
  }, controller.me)

  if (env.NODE_ENV === 'development') {
    app.post('/set-role', {
      preHandler: [app.authenticate],
      schema: { body: setRoleSchema }
    }, controller.setRole)
  }

  // Note: role-override OTP routes can be added here or in a separate user management module
}
