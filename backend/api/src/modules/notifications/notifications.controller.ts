import { FastifyReply, FastifyRequest } from 'fastify'
import { NotificationsService } from './notifications.service'
import { paginationSchema } from '../../utils/pagination'

export class NotificationsController {
  private service: NotificationsService

  constructor() {
    this.service = new NotificationsService()
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const { page, limit } = paginationSchema.parse(request.query)
    const result = await this.service.listNotifications(user.userId, page, limit)
    return result
  }

  getUnreadCount = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const count = await this.service.getUnreadCount(user.userId)
    return { count }
  }

  markRead = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const { id } = request.params as any
    try {
      const data = await this.service.markRead(id, user.userId)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Notification not found' } })
      throw err
    }
  }

  markAllRead = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    await this.service.markAllRead(user.userId)
    return { success: true }
  }

  getDeliveryStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { page, limit } = paginationSchema.parse(request.query)
    const result = await this.service.getDeliveryStatus(page, limit)
    return result
  }

  resend = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    try {
      const data = await this.service.resendNotification(id, user.userId)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Notification not found' } })
      if (err.message === 'rate_limited') return reply.code(429).send({ error: { code: 'rate_limited', message: 'Can only resend once per 24 hours' } })
      throw err
    }
  }
}
