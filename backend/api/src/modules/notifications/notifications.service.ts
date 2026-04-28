import { db } from '../../../../db'
import { notifications } from '../../../../db/schema'
import { eq, and, isNull, count, desc } from 'drizzle-orm'
import { getPaginationOffset, paginatedResponse } from '../../utils/pagination'

export class NotificationsService {
  async listNotifications(userId: string, page: number, limit: number) {
    const where = eq(notifications.userId, userId)
    const offset = getPaginationOffset(page, limit)

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(notifications).where(where),
    ])

    return paginatedResponse(rows, Number(total), page, limit)
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))

    return Number(value)
  }

  async markRead(notificationId: string, userId: string) {
    const [existing] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))

    if (!existing) throw new Error('not_found')

    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning()

    return updated
  }

  async markAllRead(userId: string) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
  }

  async createNotification(data: {
    userId: string
    kind: string
    subject: string
    body: string
    relatedFormId?: string
    relatedWebsiteId?: string
    idempotencyKey?: string
  }) {
    if (data.idempotencyKey) {
      const [existing] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.idempotencyKey, data.idempotencyKey))

      if (existing) return existing
    }

    const [notification] = await db
      .insert(notifications)
      .values({
        userId: data.userId,
        kind: data.kind,
        subject: data.subject,
        body: data.body,
        relatedFormId: data.relatedFormId,
        relatedWebsiteId: data.relatedWebsiteId,
        idempotencyKey: data.idempotencyKey,
      })
      .returning()

    return notification
  }
}
