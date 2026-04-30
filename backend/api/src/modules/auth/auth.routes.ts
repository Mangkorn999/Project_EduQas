import { FastifyInstance } from 'fastify'
import { AuthController } from './auth.controller'
import { setRoleSchema, roleOverrideOTPSchema, roleOverrideVerifySchema } from './auth.schema'

export default async function authRoutes(app: FastifyInstance) {
  const controller = new AuthController(app)

  // OAuth entry points
  app.get('/psu', controller.initiateOAuth)
  app.get('/callback', controller.callback)

  // Session management
  app.post('/refresh', controller.refresh)
  app.post('/logout', { preHandler: [app.authenticate] }, controller.logout)
  app.get('/me', { preHandler: [app.authenticate] }, controller.me)

  // Role management (Development & Admin)
  app.post('/set-role', {
    preHandler: [app.authenticate],
    schema: { body: setRoleSchema }
  }, controller.setRole)

  // Note: role-override OTP routes can be added here or in a separate user management module
}
