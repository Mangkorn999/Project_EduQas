import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

import { users } from './users'
import { notificationChannelEnum, notificationStatusEnum } from './enums'

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  channel: notificationChannelEnum('channel').notNull().default('in_app'),
  status: notificationStatusEnum('status').notNull().default('pending'),
  refId: uuid('ref_id'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  idempotencyKey: text('idempotency_key'),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('notifications_user_status_idx').on(t.userId, t.status),
  index('notifications_user_read_idx').on(t.userId, t.isRead),
  index('notifications_idempotency_idx').on(t.idempotencyKey).where(sql`${t.idempotencyKey} IS NOT NULL`),
])

export const schedulerJobRuns = pgTable('scheduler_job_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobName: text('job_name').notNull(),
  runKey: text('run_key').notNull(),
  status: text('status').notNull().default('completed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('scheduler_job_runs_job_key_idx').on(t.jobName, t.runKey),
])
