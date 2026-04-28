import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { faculties } from './faculties'
import { users } from './users'
import { templateScopeEnum } from './enums'

// ─── Criteria Templates ──────────────────────────────────────────────────────
// FR-TMPL-01~10 — Template สำหรับสร้าง form ใหม่
// admin สามารถ clone template เป็น draft form ได้ทันที
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  scope: templateScopeEnum('scope').notNull(),
  // faculty scope → ใช้ได้เฉพาะคณะเจ้าของ, global → ทุกคณะ
  ownerFacultyId: uuid('owner_faculty_id').references(() => faculties.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  isDeprecated: boolean('is_deprecated').notNull().default(false),
  // version สำหรับ optimistic locking
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('templates_scope_idx').on(t.scope).where(sql`${t.deletedAt} IS NULL`),
  index('templates_owner_faculty_idx').on(t.ownerFacultyId).where(sql`${t.deletedAt} IS NULL`),
])

// ─── Template Criteria ────────────────────────────────────────────────────────
// เกณฑ์ที่อยู่ใน template เมื่อ clone → จะ copy ไปเป็น evaluationCriteria ของ form
export const templateCriteria = pgTable('template_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  dimension: text('dimension'),
  weight: integer('weight').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('template_criteria_template_id_idx').on(t.templateId),
])

// ─── Template Questions ───────────────────────────────────────────────────────
// คำถามใน template เมื่อ clone → copy ไปเป็น formQuestions
export const templateQuestions = pgTable('template_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  // ผูก criterion ผ่านชื่อ (ไม่ใช่ FK) เพราะตอน clone จะสร้าง criterion ใหม่แล้ว map กลับ
  criterionName: text('criterion_name'),
  questionType: text('question_type').notNull(),
  label: text('label').notNull(),
  helpText: text('help_text'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('template_questions_template_id_idx').on(t.templateId),
])
