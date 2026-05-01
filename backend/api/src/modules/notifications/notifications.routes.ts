import { FastifyInstance } from 'fastify'
import { NotificationsController } from './notifications.controller'

export default async function notificationsRoutes(app: FastifyInstance) {
  const controller = new NotificationsController()

  app.get('/', { preHandler: [app.authenticate] }, controller.list)
  app.get('/unread-count', { preHandler: [app.authenticate] }, controller.getUnreadCount)
  app.put('/:id/read', { preHandler: [app.authenticate] }, controller.markRead)
  app.put('/read-all', { preHandler: [app.authenticate] }, controller.markAllRead)

  app.get('/delivery-status', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.global')]
  }, controller.getDeliveryStatus)

  app.post('/:id/resend', {
    preHandler: [app.authenticate, app.authorize('website_target.manage.global')]
  }, controller.resend)
}
