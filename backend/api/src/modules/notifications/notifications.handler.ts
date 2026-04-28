import { FastifyInstance } from 'fastify'
import { NotificationsService } from './notifications.service'
import { authenticate } from '../../middleware/authenticate'
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
}
