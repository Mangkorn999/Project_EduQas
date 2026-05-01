import { pgTable, text, timestamp, uuid, index, real, boolean, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { forms, formQuestions, formVersions } from './forms'
import { websites } from './websites'
import { rounds } from './rounds'

// ─── Evaluator Assignments ────────────────────────────────────────────────────
// FR-EVAL-01 — admin กำหนดว่าผู้ประเมินคนไหนต้องประเมินเว็บไหนในรอบไหน
export const evaluatorAssignments = pgTable('evaluator_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  roundId: uuid('round_id').notNull().references(() => rounds.id),
  websiteId: uuid('website_id').notNull().references(() => websites.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('eval_assignments_user_idx').on(t.userId),
  index('eval_assignments_round_website_idx').on(t.roundId, t.websiteId),
  uniqueIndex('eval_assignments_round_website_user_uniq').on(t.roundId, t.websiteId, t.userId),
])

// ─── Responses ────────────────────────────────────────────────────────────────
// FR-RESP-01 — คำตอบของผู้ประเมินต่อ 1 form
export const responses = pgTable('responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => forms.id),
  // ผูกกับ snapshot version ที่ผู้ใช้ตอบ เพื่อไม่ให้ form เปลี่ยนหลังตอบไปแล้ว
  formVersionId: uuid('form_version_id').references(() => formVersions.id),
  assignmentId: uuid('assignment_id').references(() => evaluatorAssignments.id),
  respondentId: uuid('respondent_id').notNull().references(() => users.id),
  // FR-EVAL-07 — metadata timestamps ทั้ง 3 จุด
  formOpenedAt: timestamp('form_opened_at', { withTimezone: true }),
  // FR-EVAL-03 — บันทึกเวลาเปิดเว็บจริง (soft gate สำหรับ submit)
  websiteOpenedAt: timestamp('website_opened_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (t) => [
  index('responses_form_id_idx').on(t.formId),
  index('responses_respondent_id_idx').on(t.respondentId),
  uniqueIndex('responses_form_respondent_active_uniq')
    .on(t.formId, t.respondentId)
    .where(sql`${t.deletedAt} IS NULL`),
  // Scoring Engine ต้องดึง response ที่ submit แล้วเท่านั้น
  index('responses_submitted_idx').on(t.formId, t.submittedAt).where(sql`${t.submittedAt} IS NOT NULL AND ${t.deletedAt} IS NULL`),
])

// ─── Response Answers ─────────────────────────────────────────────────────────
// คำตอบรายข้อ — Scoring Engine ดึงเฉพาะ valueNumber สำหรับ numeric-capable questions
export const responseAnswers = pgTable('response_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => responses.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => formQuestions.id),
  // แยก column ตาม type เพื่อให้ query scoring ได้เร็ว ไม่ต้อง cast JSON
  valueNumber: real('value_number'),
  valueText: text('value_text'),
  // สำหรับ multi_choice หรือ checkbox ที่มีหลายค่า
  valueJson: text('value_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('response_answers_response_id_idx').on(t.responseId),
  // Index สำหรับ Scoring Engine — join question + ดึง valueNumber
  uniqueIndex('response_answers_response_question_uniq').on(t.responseId, t.questionId),
])
