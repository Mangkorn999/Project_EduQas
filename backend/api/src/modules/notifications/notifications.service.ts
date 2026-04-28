import { and, desc, eq, inArray } from 'drizzle-orm'

import { db } from '../../../../db'
import { notifications } from '../../../../db/schema'

export class NotificationsService {
  async listOwn(userId: string) {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
  }

  async unreadCount(userId: string) {
    const rows = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

    return rows.length
  }

  async markRead(id: string, userId: string) {
    const [updated] = await db.update(notifications).set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning()

    if (!updated) throw new Error('not_found')
    return updated
  }

  async markAllRead(userId: string) {
    await db.update(notifications).set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

    return { success: true }
  }

  async listDeliveryStatus() {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt))
  }

  async resend(id: string) {
    const [updated] = await db.update(notifications).set({
      status: 'retrying',
      retryCount: 0,
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(notifications.id, id)).returning()

    if (!updated) throw new Error('not_found')
    return updated
  }

  async createInAppNotification(data: {
    userId: string
    type: string
    title: string
    body: string
    refId?: string
    idempotencyKey?: string
  }) {
    if (data.idempotencyKey) {
      const existing = await db.select().from(notifications)
        .where(eq(notifications.idempotencyKey, data.idempotencyKey))

      if (existing.length > 0) return existing[0]
    }

    const [created] = await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      channel: 'in_app',
      status: 'sent',
      sentAt: new Date(),
      refId: data.refId,
      idempotencyKey: data.idempotencyKey,
    }).returning()

    return created
  }

  async markFailedBatch(ids: string[], errorMessage: string) {
    if (ids.length === 0) return

    await db.update(notifications).set({
      status: 'failed',
      lastError: errorMessage,
      updatedAt: new Date(),
    }).where(inArray(notifications.id, ids))
  }
}
