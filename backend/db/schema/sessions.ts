<<<<<<< HEAD
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { inet } from 'drizzle-orm/pg-core'
=======
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { inet } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
>>>>>>> feature/ux-login-role-test
import { users } from './users'

// FR-AUTH-08/09 — hashed refresh token, atomic rotation
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  replacedByTokenId: uuid('replaced_by_token_id'), // audit trail เท่านั้น ไม่ต้องทำ FK
  userAgent: text('user_agent'),
  ip: inet('ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
<<<<<<< HEAD
})
=======
}, (t) => [
  index('refresh_tokens_user_id_idx').on(t.userId),
  index('refresh_tokens_active_idx').on(t.userId, t.revokedAt).where(sql`${t.revokedAt} IS NULL`),
])
>>>>>>> feature/ux-login-role-test
