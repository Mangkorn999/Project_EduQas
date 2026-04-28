import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'
import { faculties } from './faculties'
import { urlStatusEnum } from './enums'
import { sql } from 'drizzle-orm'

export const websites = pgTable('websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  category: text('category'),
  ownerFacultyId: uuid('owner_faculty_id').notNull().references(() => faculties.id),
  isActive: boolean('is_active').notNull().default(true),
  urlStatus: urlStatusEnum('url_status').notNull().default('unknown'),
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
})
