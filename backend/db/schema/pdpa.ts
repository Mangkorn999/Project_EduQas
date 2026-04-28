import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { pdpaRequestStatusEnum } from './enums'

// FR-DATA-07/08 — PDPA delete/anonymize request workflow
export const pdpaRequests = pgTable('pdpa_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: pdpaRequestStatusEnum('status').notNull().default('pending'),
  reason: text('reason'),
  reviewedById: uuid('reviewed_by_id').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('pdpa_requests_user_id_idx').on(t.userId),
  index('pdpa_requests_status_idx').on(t.status),
])
