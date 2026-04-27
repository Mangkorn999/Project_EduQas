import { pgEnum } from 'drizzle-orm/pg-core'

// §2.3 User Classes
export const roleEnum = pgEnum('role', [
  'super_admin',
  'admin',
  'executive',
  'teacher',
  'staff',
  'student',
])

// FR-ROUND-08
export const roundStatusEnum = pgEnum('round_status', [
  'draft',
  'active',
  'closed',
])

// FR-FORM-14
export const formStatusEnum = pgEnum('form_status', [
  'draft',
  'open',
  'closed',
])

// TEN-01 — 10 field types
export const fieldTypeEnum = pgEnum('field_type', [
  'text',
  'textarea',
  'radio',
  'checkbox',
  'rating',
  'scale',
  'date',
  'file',
  'number',
  'select',
])

// FR-NOTIF-07/08 — retry/fail lifecycle
export const notifStatusEnum = pgEnum('notif_status', [
  'pending',
  'sent',
  'failed',
])

// FR-WEB-08/09 — URL availability status
export const websiteStatusEnum = pgEnum('website_status', [
  'active',
  'inactive',
  'unreachable',
])
