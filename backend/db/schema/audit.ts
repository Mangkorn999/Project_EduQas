import { pgTable, text, timestamp, bigserial, index, jsonb } from 'drizzle-orm/pg-core'

// FR-AUDIT-02/03 — append-only audit log with SHA-256 hash chain
// ห้าม UPDATE/DELETE จาก app layer เด็ดขาด
export const auditLog = pgTable('audit_log', {
  // bigserial สำหรับ ordering ที่ deterministic
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  // uuid ใช้ใน hash formula (stored เพื่อให้ verify recompute ได้ถูกต้อง)
  uuid: text('uuid').notNull(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ip: text('ip'),
  // SHA-256 chain — prev_hash ของ row ก่อนหน้า
  prevHash: text('prev_hash').notNull(),
  hash: text('hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_log_action_idx').on(t.action),
  index('audit_log_entity_idx').on(t.entityType, t.entityId),
  index('audit_log_user_idx').on(t.userId),
  index('audit_log_created_at_idx').on(t.createdAt),
])

// FR-AUDIT-05/06 — archive หลัง 2 ปี เก็บไว้รวม 7 ปี
export const auditLogArchive = pgTable('audit_log_archive', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  uuid: text('uuid').notNull(),
  userId: text('user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ip: text('ip'),
  prevHash: text('prev_hash').notNull(),
  hash: text('hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }).notNull().defaultNow(),
})
