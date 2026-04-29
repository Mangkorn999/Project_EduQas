import { FastifyInstance } from 'fastify'
import { NotificationsService } from './notifications.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { paginationSchema } from '../../utils/pagination'

export default async function notificationsRoutes(app: FastifyInstance) {
  const service = new NotificationsService()

  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user as any
      const { page, limit } = paginationSchema.parse(request.query)
      const result = await service.listNotifications(user.sub, page, limit)
      return result
    },
  )

  app.get(
    '/unread-count',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user as any
      const count = await service.getUnreadCount(user.sub)
      return { count }
    },
  )

  app.put(
    '/:id/read',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user as any
      const { id } = request.params as any

      try {
        const data = await service.markRead(id, user.sub)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found')
          return reply.code(404).send({ error: { code: 'not_found', message: 'Notification not found' } })
        throw err
      }
    },
  )

  app.put(
    '/read-all',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const user = request.user as any
      await service.markAllRead(user.sub)
      return { success: true }
    },
  )

  // FR-NOTIF-10 — delivery status สำหรับ super_admin
  app.get(
    '/delivery-status',
    { preHandler: [authenticate, authorize(['super_admin'])] },
    async (request, reply) => {
      const { page, limit } = paginationSchema.parse(request.query)
      const result = await service.getDeliveryStatus(page, limit)
      return result
    },
  )

  // FR-NOTIF-11/13 — resend failed notification (max 1 ครั้งต่อ 24h)
  app.post(
    '/:id/resend',
    { preHandler: [authenticate, authorize(['super_admin'])] },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any

      try {
        const data = await service.resendNotification(id, user.sub)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found') {
          return reply.code(404).send({ error: { code: 'not_found', message: 'Notification not found' } })
        }
        if (err.message === 'rate_limited') {
          return reply.code(429).send({ error: { code: 'rate_limited', message: 'Can only resend once per 24 hours' } })
        }
        throw err
      }
    },
  )
}
