import { pgTable, text, timestamp, uuid, integer, jsonb, boolean, index, primaryKey } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { faculties } from './faculties'
import { users } from './users'
import { rounds } from './rounds'
import { websites } from './websites'
import { formStatusEnum, formScopeEnum, questionTypeEnum, roleEnum } from './enums'

// ─── Forms ────────────────────────────────────────────────────────────────────
// FR-FORM-01 — แบบฟอร์มประเมินเว็บไซต์ที่ผูกกับ round + website
export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  roundId: uuid('round_id').references(() => rounds.id),
  websiteTargetId: uuid('website_target_id').references(() => websites.id),
  // FR-FORM-02/03/04 — snapshot ของ URL/ชื่อ/faculty ณ ตอนสร้างฟอร์ม
  websiteUrl: text('website_url'),
  websiteName: text('website_name'),
  websiteOwnerFaculty: text('website_owner_faculty'),
  scope: formScopeEnum('scope').notNull(),
  status: formStatusEnum('status').notNull().default('draft'),
  // FR-FORM-10/11 — scope control: faculty-level หรือ university-level
  ownerFacultyId: uuid('owner_faculty_id').references(() => faculties.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  // FR-FORM-15/16 — auto open/close schedule
  openAt: timestamp('open_at', { withTimezone: true }),
  closeAt: timestamp('close_at', { withTimezone: true }),
  // FR-FORM-17 — optimistic locking version
  version: integer('version').notNull().default(1),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('forms_round_id_idx').on(t.roundId),
  index('forms_status_idx').on(t.status).where(sql`${t.deletedAt} IS NULL`),
  index('forms_owner_faculty_idx').on(t.ownerFacultyId).where(sql`${t.deletedAt} IS NULL`),
])

// FR-FORM-13 — target roles สำหรับ faculty-scoped form (university scope ไม่ใช้)
export const formTargetRoles = pgTable('form_target_roles', {
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
}, (t) => [
  primaryKey({ columns: [t.formId, t.role] }),
])

// FR-FORM-13b — target faculties: คณะที่ form ถูกส่งไปประเมิน (เมื่อ publish)
export const formTargetFaculties = pgTable('form_target_faculties', {
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  facultyId: uuid('faculty_id').notNull().references(() => faculties.id),
}, (t) => [
  primaryKey({ columns: [t.formId, t.facultyId] }),
])

// ─── Evaluation Criteria ──────────────────────────────────────────────────────
// FR-CRIT-01~08 — เกณฑ์การประเมิน snapshot ที่ผูกกับ form
// เมื่อ form ถูก publish จะ snapshot criteria จาก template ลงมาที่นี่
export const evaluationCriteria = pgTable('evaluation_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // dimension ใช้จัดกลุ่มแสดงใน heatmap (Design, Usability, Content, Performance, Mobile)
  dimension: text('dimension'),
  // น้ำหนัก — ค่า relative ไม่จำเป็นต้องรวมกันได้ 100 แต่ frontend ควรแจ้งเตือน
  weight: integer('weight').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('eval_criteria_form_id_idx').on(t.formId),
])

// ─── Form Questions ───────────────────────────────────────────────────────────
// FR-FORM-05 — คำถามในแต่ละ form ที่ผูกกับ criterion (ถ้าเป็น scorable)
export const formQuestions = pgTable('form_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  // criterion_id เป็น nullable — ถ้า null คือคำถามที่ไม่ score (เช่น feedback text)
  criterionId: uuid('criterion_id').references(() => evaluationCriteria.id, { onDelete: 'set null' }),
  questionType: questionTypeEnum('question_type').notNull(),
  label: text('label').notNull(),
  helpText: text('help_text'),
  isRequired: boolean('is_required').notNull().default(false),
  // ลำดับคำถามที่แสดงบน UI (dnd-kit reorder)
  sortOrder: integer('sort_order').notNull().default(0),
  // config เก็บ options สำหรับ single_choice, multi_choice, etc.
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('form_questions_form_id_idx').on(t.formId),
])

// ─── Form Versions (Snapshots) ────────────────────────────────────────────────
// FR-FORM-20 — immutable snapshot เมื่อ form ถูก publish
export const formVersions = pgTable('form_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => forms.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  // snapshot เก็บ JSON ของ form + questions + criteria ทั้ง set ณ จุดที่ publish
  snapshot: jsonb('snapshot').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('form_versions_form_id_idx').on(t.formId),
])
