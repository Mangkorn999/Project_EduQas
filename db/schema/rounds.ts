import { pgTable, text, timestamp, uuid, integer, primaryKey } from 'drizzle-orm/pg-core'
import { faculties } from './faculties'
import { users } from './users'
import { roundScopeEnum, roundStatusEnum } from './enums'
import { websites } from './websites'

export const rounds = pgTable('rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  academicYear: integer('academic_year').notNull(),
  semester: integer('semester').notNull(),
  openDate: timestamp('open_date', { withTimezone: true }),
  closeDate: timestamp('close_date', { withTimezone: true }),
  scope: roundScopeEnum('scope').notNull(),
  facultyId: uuid('faculty_id').references(() => faculties.id), // Nullable for university scope
  status: roundStatusEnum('status').notNull().default('draft'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
})

// FR-ROUND-04, FR-WEB-05 — Junction table to link websites to rounds
export const roundWebsites = pgTable('round_websites', {
  roundId: uuid('round_id').notNull().references(() => rounds.id),
  websiteId: uuid('website_id').notNull().references(() => websites.id),
}, (t) => [
  primaryKey({ columns: [t.roundId, t.websiteId] })
])
