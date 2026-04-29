import { db } from '../../../../db'
import { notifications, notificationLog } from '../../../../db/schema'
import { eq, and, isNull, count, desc, sql, gt } from 'drizzle-orm'
import { getPaginationOffset, paginatedResponse } from '../../utils/pagination'
import { EventEmitter } from 'events'

export const emailQueueEmitter = new EventEmitter()

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

  // FR-NOTIF-10 — delivery status สำหรับ super_admin
  async getDeliveryStatus(page: number, limit: number) {
    const offset = getPaginationOffset(page, limit)

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: notifications.id,
          userId: notifications.userId,
          kind: notifications.kind,
          subject: notifications.subject,
          body: notifications.body,
          createdAt: notifications.createdAt,
          logId: notificationLog.id,
          channel: notificationLog.channel,
          status: notificationLog.status,
          attempt: notificationLog.attempt,
          errorMessage: notificationLog.errorMessage,
          deliveredAt: notificationLog.deliveredAt,
        })
        .from(notifications)
        .leftJoin(notificationLog, eq(notifications.id, notificationLog.notificationId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(notifications),
    ])

    return paginatedResponse(rows, Number(total), page, limit)
  }

  // FR-NOTIF-11/13 — resend failed notification (max 1 ครั้งต่อ 24h)
  async resendNotification(notificationId: string, userId: string) {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))

    if (!notification) throw new Error('not_found')

    // Check if already resent in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentResends = await db
      .select()
      .from(notificationLog)
      .where(
        and(
          eq(notificationLog.notificationId, notificationId),
          gt(notificationLog.createdAt, twentyFourHoursAgo)
        )
      )

    if (recentResends.length > 0) {
      throw new Error('rate_limited')
    }

    // Create new log entry for resend
    const [log] = await db
      .insert(notificationLog)
      .values({
        notificationId,
        channel: 'email',
        status: 'pending',
        attempt: 1,
      })
      .returning()

    // Trigger email send job
    emailQueueEmitter.emit('enqueue', log.id)
    console.log(`[notifications] Enqueued email job for notificationLog ${log.id}`)

    return log
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
