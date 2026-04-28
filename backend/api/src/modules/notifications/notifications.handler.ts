import { FastifyInstance } from 'fastify'

import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { sendError } from '../../lib/errors'
import { NotificationsService } from './notifications.service'
import { RetryService } from './retry.service'

export default async function notificationsRoutes(app: FastifyInstance) {
  const service = new NotificationsService()
  const retryService = new RetryService()

  app.get('/notifications', {
    preHandler: [authenticate],
  }, async (request) => {
    const data = await service.listOwn(request.user.userId)
    return { data }
  })

  app.get('/notifications/unread-count', {
    preHandler: [authenticate],
  }, async (request) => {
    const count = await service.unreadCount(request.user.userId)
    return { data: { count } }
  })

  app.put('/notifications/:id/read', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any

    try {
      const data = await service.markRead(id, request.user.userId)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Notification not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.put('/notifications/read-all', {
    preHandler: [authenticate],
  }, async (request) => {
    const data = await service.markAllRead(request.user.userId)
    return { data }
  })

  app.get('/notifications/delivery-status', {
    preHandler: [authenticate, authorize(['super_admin'])],
  }, async () => {
    const data = await service.listDeliveryStatus()
    return { data }
  })

  app.post('/notifications/:id/resend', {
    preHandler: [authenticate, authorize(['super_admin'])],
  }, async (request, reply) => {
    const { id } = request.params as any

    try {
      const data = await retryService.retryNotification(id)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Notification not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })
}
