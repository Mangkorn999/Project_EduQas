import { index, uniqueIndex, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { faculties } from './faculties'
import { roleEnum } from './enums'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  psuPassportId: text('psu_passport_id').notNull().unique(),
  email: text('email').notNull(),
  role: roleEnum('role').notNull().default('student'),
  facultyId: uuid('faculty_id').notNull().references(() => faculties.id),
  displayName: text('display_name').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('users_faculty_id_idx').on(t.facultyId).where(sql`${t.deletedAt} IS NULL`),
  index('users_role_idx').on(t.role).where(sql`${t.deletedAt} IS NULL`),
])

// FR-AUTH-15, FR-AUTH-20 — role override by super_admin via OTP
export const roleOverrides = pgTable('role_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  overrideRole: roleEnum('override_role').notNull(),
  reason: text('reason').notNull(),
  approvedBy: uuid('approved_by').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  // 1 user มี active override ได้แค่ 1 อัน
  uniqueIndex('role_overrides_user_active_uniq')
    .on(t.userId)
    .where(sql`${t.expiresAt} IS NULL`),
])

