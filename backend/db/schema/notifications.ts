import { pgTable, text, timestamp, uuid, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { notificationChannelEnum, notificationStatusEnum } from './enums'

// FR-NOTIF-12 — in-app notification
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  kind: text('kind').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  relatedFormId: uuid('related_form_id'),
  relatedWebsiteId: uuid('related_website_id'),
  readAt: timestamp('read_at', { withTimezone: true }),
  // FR-NOTIF-06 — idempotency ป้องกัน scheduler ส่งซ้ำ
  idempotencyKey: text('idempotency_key').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('notifications_user_id_idx').on(t.userId),
  index('notifications_unread_idx').on(t.userId).where(sql`${t.readAt} IS NULL`),
])

// FR-NOTIF-07/08/10 — delivery tracking สำหรับ email channel
export const notificationLog = pgTable('notification_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  channel: notificationChannelEnum('channel').notNull(),
  status: notificationStatusEnum('status').notNull().default('pending'),
  attempt: integer('attempt').notNull().default(1),
  errorMessage: text('error_message'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('notification_log_notification_id_idx').on(t.notificationId),
  index('notification_log_status_idx').on(t.status),
])
