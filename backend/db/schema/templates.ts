import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, index, primaryKey } from 'drizzle-orm/pg-core'
import { faculties } from './faculties'
import { users } from './users'
import { templateScopeEnum, questionTypeEnum } from './enums'

// FR-TMPL-01 — template มี scope faculty หรือ global
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  scope: templateScopeEnum('scope').notNull(),
  ownerFacultyId: uuid('owner_faculty_id').references(() => faculties.id),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  // FR-TMPL-05 — deprecate โดยไม่ลบ
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('templates_scope_idx').on(t.scope),
  index('templates_faculty_idx').on(t.ownerFacultyId),
])

// คำถามใน template — clone เข้า form_questions เมื่อสร้าง form จาก template
export const templateQuestions = pgTable('template_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  questionType: questionTypeEnum('question_type').notNull(),
  label: text('label').notNull(),
  helpText: text('help_text'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('template_questions_template_id_idx').on(t.templateId),
])
