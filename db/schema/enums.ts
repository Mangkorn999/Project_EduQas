import { pgEnum } from 'drizzle-orm/pg-core'

// ─── Auth & Users ─────────────────────────────────────────────────────────────
// §2.3 — 6 roles ใช้ทั่วทั้งระบบ
export const roleEnum = pgEnum('role', [
  'super_admin',
  'admin',
  'executive',
  'teacher',
  'staff',
  'student',
])

// ─── Website ──────────────────────────────────────────────────────────────────
// FR-WEB-08/09 — URL availability จาก cron job ตรวจทุก 24 ชม.
export const urlStatusEnum = pgEnum('url_status', [
  'unknown',
  'ok',
  'unreachable',
])

// ─── Evaluation Scope ─────────────────────────────────────────────────────────
// FR-FORM-10/11 — form scope
export const formScopeEnum = pgEnum('form_scope', ['faculty', 'university'])

// FR-TMPL-01 — template scope
export const templateScopeEnum = pgEnum('template_scope', ['faculty', 'global'])

// FR-ROUND-02/03 — round scope
export const roundScopeEnum = pgEnum('round_scope', ['faculty', 'university'])

// ─── Evaluation Lifecycle ─────────────────────────────────────────────────────
// FR-ROUND-08 — lifecycle ของ EvaluationRound
export const roundStatusEnum = pgEnum('round_status', [
  'draft',
  'active',
  'closed',
])

// FR-FORM-14 — lifecycle ของ Form
export const formStatusEnum = pgEnum('form_status', [
  'draft',
  'open',
  'closed',
])

// FR-FORM-05 — 10 question types สำหรับ Form Builder
export const questionTypeEnum = pgEnum('question_type', [
  'short_text',
  'long_text',
  'single_choice',
  'multi_choice',
  'rating',
  'scale_5',
  'scale_10',
  'boolean',
  'date',
  'number',
])

// ─── Notification ─────────────────────────────────────────────────────────────
// FR-NOTIF delivery channel
export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'in_app',
])

// FR-NOTIF-07/08 — retry/fail lifecycle (max 3 retries, then failed)
export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
  'retrying',
])
