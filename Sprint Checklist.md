# 🎓 EILA — Intern Sprint Checklist (Vertical Slice)
> **Model:** Full-Stack Vertical Slice — ทั้งคู่ได้เขียน Schema + API + UI ทุก task
> **เป้าหมาย:** Dev A และ Dev B ได้ความรู้ครอบคลุมเท่ากัน ไม่ใช่แค่ BE หรือ FE อย่างเดียว
> **Rule for AI:** อ่านเฉพาะ section ของตัวเอง + Shared Context

---

## 📦 SHARED CONTEXT (Both AI Must Read)

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, dnd-kit, React Hook Form + Zod |
| Backend | Fastify + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Scheduler | node-cron |
| Export | pdf-lib + ExcelJS |
| Auth | PSU Passport OAuth2 + PKCE, JWT rotation |

### แต่ละ Dev จะได้เรียนอะไร (สมดุลกัน)
| ทักษะ | Dev A | Dev B |
|---|---|---|
| Drizzle Schema | ✅ | ✅ |
| Fastify API | ✅ | ✅ |
| Zod Validation | ✅ | ✅ |
| Next.js / React | ✅ | ✅ |
| Testing | ✅ | ✅ |
| เรื่องพิเศษ | Auth/Security, Scoring Algorithm | Form System, Notification, Audit |

### Dependency Chain (Critical Path)
[Dev A] Base Enums + Auth Schema
→ [Dev A] Auth API + Login UI
→ [Dev B] Form Schema + API   &   [Dev A] Website + Round Schema + API
→ [Dev B] Evaluator Flow UI
→ [Dev A] Scoring Engine + Ranking UI
→ [Dev B] Audit + Export UI
### Shared Files — Handle With Care
| File | Rule |
|---|---|
| `SRS2.1.md` | Change-control only |
| `docs/design/api-contracts.md` | One active writer per day |
| `db/migrations/*` | Whoever owns that schema module creates its migration |
| `packages/shared/schemas/*` | Discuss contract before writing |

### Branch Naming
Dev A → feature/core-<domain>    e.g. feature/core-auth, feature/core-scoring
Dev B → feature/ux-<domain>      e.g. feature/ux-forms, feature/ux-notifications
Shared → feature/shared-<topic>  (requires both reviewers)
### PR Rules
- Max 500 LOC per PR
- 1 domain per PR
- ต้องอ่าน SRS2.1 ก่อน implement feature นั้น
- Shared file changes ต้องให้อีก dev review

---
---

# 👤 DEV A — Auth · Website · Round · Scoring
> Dev A เรียน: OAuth2 security, Drizzle schema, Fastify API, Scoring algorithm, React Dashboard
> **Branch pattern:** `feature/core-<domain>`

---

## DEVA-01 · Base Schema Foundation
> Depends on: nothing | Branch: `feature/core-base-schema`
> 🎓 ได้เรียน: Drizzle ORM, PostgreSQL enum, migration

**Files to create:**
db/schema/enums.ts
db/migrations/0001_base_enums.ts
**Checklist:**
- [ ] อ่าน `SRS2.1.md` section Entity & Role ก่อน implement
- [ ] Define enums: `role`, `round_status`, `form_status`, `field_type`, `notif_status`, `website_status`
- [ ] Enum values ต้องตรงกับ SRS2.1 ทุกตัว — ห้ามเดาหรือ rename เอง
- [ ] `drizzle-kit migrate` รันผ่านโดยไม่มี warning
- [ ] เขียน comment อธิบาย enum แต่ละตัวว่าใช้ตอนไหน
- [ ] แจ้ง Dev B ทันทีที่ merge เพื่อให้เริ่ม DEVB-01 ได้

---

## DEVA-02 · Auth — Full Stack
> Depends on: DEVA-01 | Branch: `feature/core-auth`
> 🎓 ได้เรียน: OAuth2+PKCE, JWT rotation, Fastify middleware, Next.js App Router, useContext

**Backend files to create:**
db/schema/users.ts
db/schema/sessions.ts
db/migrations/0002_auth.ts
api/src/modules/auth/oauth.handler.ts
api/src/modules/auth/session.service.ts
api/src/modules/auth/token.service.ts
api/src/modules/auth/otp.service.ts
api/src/middleware/authenticate.ts
api/src/middleware/authorize.ts
api/src/modules/security/csrf.middleware.ts
api/src/modules/security/ratelimit.middleware.ts
**Frontend files to create:**
web/app/(public)/login/page.tsx
web/app/(public)/callback/page.tsx
web/components/AppShell/AppShell.tsx
web/components/AppShell/Sidebar.tsx
web/lib/auth/AuthContext.tsx
web/lib/auth/useAuth.ts
web/middleware.ts
**Checklist — Backend:**
- [ ] อ่าน SRS2.1 Auth section ก่อน implement
- [ ] Schema: `users` table (id, psu_passport_id, role, faculty_id, created_at)
- [ ] Schema: `sessions` table (id, user_id, refresh_token_hash, expires_at, revoked_at)
- [ ] Migration รันผ่าน + FK constraint ระหว่าง sessions → users
- [ ] OAuth2 callback: แลก `code` → access token จาก PSU Passport
- [ ] ออก JWT access token (TTL 15 นาที) + refresh token (TTL 7 วัน)
- [ ] Refresh rotation: revoke old refresh token ทุกครั้งที่ขอ token ใหม่
- [ ] Reuse detection: ถ้าใช้ refresh token ที่ถูก revoke แล้ว → revoke-all sessions ของ user นั้น
- [ ] `POST /auth/revoke-all` ทำงานถูกต้อง
- [ ] OTP override: single-use + expire ใน 5 นาที
- [ ] Rate limit: auth endpoints จำกัด 10 req/min per IP
- [ ] CSRF token header required สำหรับ mutating routes
- [ ] Role policy enforce ใน `authorize.ts` ตาม SRS2.1 role matrix
- [ ] Integration test: login → refresh → revoke-all → old token rejected

**Checklist — Frontend:**
- [ ] `/login` page: ปุ่ม "เข้าสู่ระบบด้วย PSU Passport" redirect ไป OAuth2
- [ ] `/callback` page: รับ `code`, เรียก API, เก็บ JWT ใน httpOnly cookie (ไม่ใช่ localStorage)
- [ ] `AuthContext.tsx`: provide `user`, `role`, `isLoading`, `logout`
- [ ] `useAuth()` hook: consume AuthContext, redirect ถ้าไม่มี session
- [ ] `web/middleware.ts`: guard ทุก route ใน `(auth)/**` → redirect `/login` ถ้า unauthenticated
- [ ] Sidebar render menu items ตาม role ที่ได้จาก JWT
- [ ] Logout: clear cookie + redirect `/login`
- [ ] Loading skeleton ระหว่างดึง user session
- [ ] ⚠️ **Publish** `GET /auth/me` response shape → `docs/design/api-contracts.md`

---

## DEVA-03 · Website Registry + Evaluation Rounds — Full Stack
> Depends on: DEVA-02 | Branch: `feature/core-website-round`
> 🎓 ได้เรียน: Relational schema design, REST CRUD, Next.js dynamic routes, React Table

**Backend files to create:**
db/schema/websites.ts
db/schema/rounds.ts
db/migrations/0003_website_round.ts
api/src/modules/websites/websites.handler.ts
api/src/modules/websites/websites.service.ts
api/src/modules/rounds/rounds.handler.ts
api/src/modules/rounds/rounds.service.ts
**Frontend files to create:**
web/app/(auth)/websites/page.tsx
web/app/(auth)/websites/[id]/page.tsx
web/app/(auth)/rounds/page.tsx
web/app/(auth)/rounds/[id]/page.tsx
web/components/shared-ui/DataTable.tsx
web/components/shared-ui/FilterBar.tsx
web/components/shared-ui/ConfirmDialog.tsx
**Checklist — Backend:**
- [ ] Schema: `websites` (id, name, url, faculty_id, status, last_checked_at)
- [ ] Schema: `rounds` (id, name, faculty_id, status, open_at, close_at)
- [ ] Schema: `round_websites` junction table (round_id, website_id)
- [ ] Migration รันผ่าน + unique constraint (1 website ต่อ 1 round ต่อ faculty)
- [ ] URL validation: ตรวจ format ตอน create/update website
- [ ] `POST/GET/PATCH/DELETE /websites` พร้อม faculty_scope filter ทุก query
- [ ] `POST/GET/PATCH/DELETE /rounds` พร้อม lifecycle state machine (draft→open→closed)
- [ ] Cross-faculty leak test: faculty A user → ดึงข้อมูล faculty B → 403
- [ ] Integration test: round lifecycle draft → open → closed ครบ

**Checklist — Frontend:**
- [ ] Websites page: ตาราง list, search/filter ตาม status, add/edit/delete
- [ ] Reuse `DataTable.tsx` สำหรับ pagination + sort + filter
- [ ] Confirm dialog ก่อน delete ทุกครั้ง
- [ ] Rounds page: ตาราง list, สร้าง round พร้อม date range picker
- [ ] Round detail page: assign websites เข้า round (multi-select)
- [ ] Status badge แสดงสถานะ round ด้วยสี (draft=gray, open=green, closed=red)
- [ ] Form submit ใช้ React Hook Form + Zod validate ก่อนส่ง
- [ ] Error message จาก API แสดงใต้ field ที่ผิด
- [ ] ⚠️ **Publish** `/websites`, `/rounds` API shapes → `docs/design/api-contracts.md`

---

## DEVA-04 · Scoring Engine + Ranking & Dashboard UI — Full Stack
> Depends on: DEVB-02 (responses API) | Branch: `feature/core-scoring`
> 🎓 ได้เรียน: Algorithm design, deterministic testing, Recharts, data visualization

**Backend files to create:**
api/src/modules/scoring/score.service.ts
api/src/modules/scoring/weight.service.ts
api/src/modules/ranking/eligibility.service.ts
api/src/modules/ranking/ranking.service.ts
api/src/modules/ranking/ranking.handler.ts
api/src/modules/dashboard/dashboard.handler.ts
**Frontend files to create:**
web/app/(auth)/dashboard/page.tsx
web/app/(auth)/executive/page.tsx
web/components/dashboard/OverviewCards.tsx
web/components/dashboard/TrendChart.tsx
web/components/dashboard/HeatmapChart.tsx
web/components/ranking/RankingTable.tsx
web/components/ranking/ScorecardPanel.tsx
web/components/ranking/ExclusionBadge.tsx
**Checklist — Backend:**
- [ ] อ่าน `docs/design/scoring-and-ranking.md` ก่อน implement ทุกบรรทัด
- [ ] Weighted score: `Σ(field_score × weight) / Σ(weights)` ต้องตรงตาม spec
- [ ] Websites ที่ response ไม่ถึง threshold → mark `excluded_low_response = true`
- [ ] Tie-break rule implement ตาม SRS2.1 ให้ deterministic (input เดิม → rank เดิมเสมอ)
- [ ] `GET /rankings/:roundId` return ranked list พร้อม eligibility flags
- [ ] `GET /websites/:id/scorecard` return per-criterion score breakdown
- [ ] `GET /dashboard/overview` return summary stats
- [ ] Golden dataset test: fixed static input → assert exact output ไม่เปลี่ยน (snapshot test)
- [ ] Edge case test: all tied, all excluded, zero responses, single respondent
- [ ] ⚠️ **Publish** scoring/ranking API shapes → `docs/design/api-contracts.md`

**Checklist — Frontend:**
- [ ] Overview cards: ยอด evaluated, avg score, top-ranked website, pending
- [ ] Trend chart (line): score over time per website ใช้ Recharts
- [ ] Heatmap: criteria × website score grid ใช้สีไล่ระดับ
- [ ] Ranking table: rank, website name, score, response count, exclusion badge
- [ ] `ExclusionBadge`: แสดง reason ที่อ่านเข้าใจได้ (ไม่ใช่แค่ hidden)
- [ ] Scorecard panel: per-criterion breakdown แสดง weight ด้วย
- [ ] Executive page: cross-round comparison, faculty-level aggregation
- [ ] `NEXT_PUBLIC_USE_FIXTURE=true` โหลด static JSON แทน API (สำหรับ dev)
- [ ] ทุก chart มี data table สำรองให้กดดูได้ (accessibility)
- [ ] Empty state: แสดงข้อความเป็นมิตรเมื่อยังไม่มี response

**Dev A รวม checklist: ~66 items**

---
---

# 👤 DEV B — Forms · Evaluator · Notifications · Audit
> Dev B เรียน: Complex schema relations, Form system, Background jobs, Audit/compliance, Drag-and-drop UI
> **Branch pattern:** `feature/ux-<domain>`

---

## DEVB-01 · Form Builder — Full Stack
> Depends on: DEVA-01 (enums), DEVA-03 (rounds schema) | Branch: `feature/ux-forms`
> 🎓 ได้เรียน: Relational schema (versioning), Fastify API, dnd-kit, React Hook Form

**Backend files to create:**
db/schema/forms.ts
db/schema/form_fields.ts
db/schema/form_versions.ts
db/migrations/0004_forms.ts
api/src/modules/forms/forms.handler.ts
api/src/modules/forms/forms.service.ts
api/src/modules/forms/snapshot.service.ts
api/src/modules/forms/fields.service.ts
**Frontend files to create:**
web/app/(auth)/forms/page.tsx
web/app/(auth)/forms/[id]/builder/page.tsx
web/app/(auth)/forms/[id]/versions/page.tsx
web/components/form-builder/FormBuilder.tsx
web/components/form-builder/DragDropCanvas.tsx
web/components/form-builder/FieldEditor.tsx
web/components/form-builder/WeightInput.tsx
**Checklist — Backend:**
- [ ] อ่าน SRS2.1 Form Builder section ก่อน implement
- [ ] Schema: `forms` (id, round_id, title, status, created_by)
- [ ] Schema: `form_fields` (id, form_id, field_type, label, order, weight, config jsonb)
- [ ] Schema: `form_versions` (id, form_id, snapshot jsonb, version_number, created_at)
- [ ] Migration รันผ่าน + FK form_fields → forms, form_versions → forms
- [ ] `POST/GET/PATCH/DELETE /forms` พร้อม faculty_scope filter
- [ ] Support field types ครบ 10 ตามSRS2.1: text, textarea, radio, checkbox, rating, scale, date, file, number, select
- [ ] `POST /forms/:id/publish` → create immutable snapshot ใน `form_versions`
- [ ] `GET /forms/:id/versions` → list snapshots ทั้งหมด
- [ ] `POST /forms/:id/versions/:versionId/rollback` → restore snapshot
- [ ] ห้าม edit published form โดยตรง — ต้อง clone เป็น draft ก่อน
- [ ] Integration test: publish → rollback → re-publish ครบ cycle

**Checklist — Frontend:**
- [ ] Forms list page: แสดงทุก form พร้อม status badge + link to builder
- [ ] Form Builder: drag-and-drop reorder fields ด้วย `dnd-kit`
- [ ] Field Editor panel: กด field → แก้ label, required toggle, help text, options
- [ ] `WeightInput.tsx`: กรอก weight แต่ละ field + แสดง live sum (ควรรวมได้ 100%)
- [ ] Warning ถ้า weight sum ≠ 100 ก่อน publish
- [ ] Publish button: confirm dialog แจ้งว่า snapshot จะถูกสร้าง
- [ ] Versions page: timeline ของทุก version พร้อมปุ่ม Rollback
- [ ] Rollback confirm dialog แจ้ง warning ว่า current draft จะถูกแทนที่
- [ ] Form state managed ด้วย React Hook Form + Zod
- [ ] ⚠️ **Publish** `/forms`, `/form_fields` API shapes → `docs/design/api-contracts.md`

---

## DEVB-02 · Evaluator Flow — Full Stack
> Depends on: DEVB-01 (forms API), DEVA-03 (rounds API) | Branch: `feature/ux-evaluator`
> 🎓 ได้เรียน: Event sourcing concept, API state machine, Form rendering, UX soft gate

**Backend files to create:**
db/schema/responses.ts
db/schema/response_events.ts
db/schema/evaluator_assignments.ts
db/migrations/0005_responses.ts
api/src/modules/responses/responses.handler.ts
api/src/modules/responses/responses.service.ts
api/src/modules/responses/events.handler.ts
api/src/modules/users/assignments.service.ts
**Frontend files to create:**
web/app/(auth)/evaluator/page.tsx
web/app/(auth)/evaluator/[roundId]/[websiteId]/page.tsx
web/components/form-runner/FormRunner.tsx
web/components/form-runner/FieldRenderer.tsx
web/components/form-runner/WebsiteGate.tsx
web/components/form-runner/SubmitGuard.tsx
**Checklist — Backend:**
- [ ] อ่าน SRS2.1 Evaluator Flow section ก่อน implement
- [ ] Schema: `evaluator_assignments` (id, user_id, round_id, website_id)
- [ ] Schema: `responses` (id, assignment_id, form_version_id, status, submitted_at)
- [ ] Schema: `response_events` (id, response_id, type, created_at) — type: `website_opened`, `submitted`
- [ ] Migration รันผ่าน + FK chain assignment → response → events
- [ ] `GET /evaluator/assignments` → list งานที่ assign ให้ user นั้น
- [ ] `POST /responses` → create draft response
- [ ] `PATCH /responses/:id` → save/update answers (เฉพาะก่อน round close)
- [ ] `POST /responses/:id/events` → record event (website_opened / submitted)
- [ ] Submit validation: ต้องมี `website_opened` event ก่อน → ถ้าไม่มี return 422
- [ ] Round closed → PATCH/submit ทำไม่ได้ → return 409
- [ ] Integration test: submit without website-open → 422
- [ ] Integration test: submit after round close → 409
- [ ] Integration test: save draft → reopen → continue editing → submit ครบ

**Checklist — Frontend:**
- [ ] Evaluator home: list assignments พร้อม status (not started / in progress / submitted)
- [ ] กด website link → เปิด tab ใหม่ + fire `POST /responses/:id/events { type: website_opened }`
- [ ] `WebsiteGate.tsx`: ปุ่ม Submit disabled พร้อม tooltip "กรุณาเปิดเว็บไซต์ก่อนส่งคำตอบ"
- [ ] Submit enable เฉพาะหลัง `website_opened` event confirmed จาก API
- [ ] `FieldRenderer.tsx` render ครบ 10 field types ตาม form_version snapshot
- [ ] Form state ใช้ React Hook Form + Zod (schema generate จาก field config)
- [ ] บันทึก draft อัตโนมัติ (debounce 2 วินาทีหลังพิมพ์)
- [ ] Round closed → form render แบบ read-only ทุก field ไม่มีปุ่ม submit
- [ ] Loading skeleton ระหว่างโหลด form
- [ ] Error สแดง requestId สำหรับ support

---

## DEVB-03 · Notifications — Full Stack
> Depends on: DEVB-02 | Branch: `feature/ux-notifications`
> 🎓 ได้เรียน: Background job, Retry pattern, node-cron, React real-time UI pattern

**Backend files to create:**
db/schema/notifications.ts
db/migrations/0006_notifications.ts
api/src/modules/notifications/email.service.ts
api/src/modules/notifications/inapp.service.ts
api/src/modules/notifications/retry.service.ts
api/src/modules/notifications/notifications.handler.ts
api/src/modules/scheduler/cron.registry.ts
api/src/modules/scheduler/jobs/reminder.job.ts
api/src/modules/scheduler/jobs/round-open.job.ts
api/src/modules/scheduler/jobs/round-close.job.ts
api/src/modules/scheduler/jobs/url-check.job.ts
**Frontend files to create:**
web/components/notifications/NotificationBell.tsx
web/components/notifications/NotificationPanel.tsx
web/app/(auth)/notifications/delivery-status/page.tsx
**Checklist — Backend:**
- [ ] อ่าน SRS2.1 Notification + Scheduler section ก่อน implement
- [ ] Schema: `notifications` (id, user_id, type, title, body, status, ref_id, created_at)
- [ ] Migration รันผ่าน + index on (user_id, status)
- [ ] `CRON_ENABLED=true` guard ที่ startup — cron ทำงานได้แค่ 1 instance
- [ ] ทุก cron job ต้องเป็น idempotent (รันซ้ำ 2 ครั้ง ได้ผลเหมือนกัน)
- [ ] Idempotency key ต่อ job execution เก็บใน DB
- [ ] round-open job: เปลี่ยน round_status → open + สร้าง in-app notification
- [ ] round-close job: เปลี่ยน round_status → closed + ส่ง email แจ้งผู้เกี่ยวข้อง
- [ ] url-check job: ping website URL + update `availability_status` + `last_checked_at`
- [ ] reminder job: ส่ง notif ให้ evaluator ที่ยังไม่ submit ก่อน deadline
- [ ] Email service: ส่งผ่าน SMTP, template-based (subject + html body)
- [ ] Retry: max 3 ครั้ง, exponential backoff, `status = 'failed'` หลังหมด
- [ ] `GET /notifications` return list สำหรับ current user
- [ ] `PATCH /notifications/:id/read` mark as read
- [ ] `PATCH /notifications/read-all` mark all as read
- [ ] `POST /notifications/:id/resend` resend failed notification
- [ ] Test: รัน job ซ้ำ 2 ครั้ง → ไม่มี duplicate notification
- [ ] Test: retry exhaust → status = 'failed' confirmed

**Checklist — Frontend:**
- [ ] `NotificationBell.tsx`: badge แสดงจำนวน unread, กดเปิด panel
- [ ] `NotificationPanel.tsx`: list notifications, กดอ่าน → mark as read, "อ่านทั้งหมด" button
- [ ] Unread count refetch เมื่อเปิด panel (ไม่ต้อง long-poll)
- [ ] Delivery Status page: ตาราง sent notifications พร้อม status column
- [ ] Resend button: กดแล้ว optimistic update status → pending → success/fail
- [ ] Failed row แสดง error reason จาก API

---

## DEVB-04 · Audit/PDPA + Import/Export — Full Stack
> Depends on: DEVB-02 | Branch: `feature/ux-audit`
> 🎓 ได้เรียน: Hash chain / data integrity, PDPA compliance concept, File processing, PDF/XLSX generation

**Backend files to create:**
db/schema/audit_logs.ts
db/schema/pdpa_requests.ts
db/migrations/0007_audit_pdpa.ts
api/src/modules/audit/hash-chain.service.ts
api/src/modules/audit/verify.handler.ts
api/src/modules/pdpa/request.handler.ts
api/src/modules/pdpa/approve.handler.ts
api/src/modules/pdpa/anonymize.service.ts
api/src/modules/pdpa/retention.policy.ts
api/src/modules/export/export.handler.ts
api/src/modules/export/pdf.service.ts
api/src/modules/export/excel.service.ts
api/src/modules/import/import.handler.ts
api/src/modules/import/validate.service.ts
**Frontend files to create:**
web/app/(auth)/reports/page.tsx
web/app/(auth)/admin/audit/page.tsx
web/app/(auth)/admin/pdpa/page.tsx
web/components/import-export/ImportWizard.tsx
web/components/import-export/ExportMenu.tsx
**Checklist — Backend:**
- [ ] อ่าน SRS2.1 Audit + PDPA section ก่อน implement
- [ ] Schema: `audit_logs` (id, prev_hash, hash, action, actor_id, target, payload, created_at)
- [ ] Schema: `pdpa_requests` (id, requester_id, type, status, approved_by, completed_at)
- [ ] Migration รันผ่าน + index on audit_logs.created_at
- [ ] Hash chain: `hash = SHA256(prev_hash + JSON.stringify(entry_data))`
- [ ] ทุก action สำคัญ (login, delete, publish, anonymize) ต้องเขียน audit log
- [ ] `GET /audit/verify` เดิน chain ทั้งหมด → `{ valid: true }` หรือ `{ broken_at: entryId }`
- [ ] Anonymize: แทนที่ PII (name, email, student_id) ด้วย `[ANONYMIZED]` — scores คงอยู่
- [ ] PDPA flow: submit request → admin approve → anonymize/purge execute
- [ ] Purge: ทำได้เฉพาะหลัง retention period หมด + PDPA approval บันทึกแล้ว
- [ ] Export JSON: raw response data per round
- [ ] Export XLSX: formatted report ใช้ ExcelJS
- [ ] Export PDF: scorecard/ranking report ใช้ pdf-lib
- [ ] Import: รับ JSON/XLSX, validate schema, return error per-row ถ้าผิด
- [ ] Test: tamper entry → `GET /audit/verify` detect และ report entry ID
- [ ] Test: anonymize → PII หายไป, scores ยังอยู่ครบ

**Checklist — Frontend:**
- [ ] Reports page: เลือก round → ดู summary + ปุ่ม export (JSON/XLSX/PDF)
- [ ] `ExportMenu.tsx`: dropdown 3 format, แสดง loading spinner ระหว่าง generate
- [ ] `ImportWizard.tsx`: Step 1 อัปโหลด → Step 2 preview rows + error per-row → Step 3 confirm
- [ ] Import error แสดงเป็น row-level inline ไม่ใช่แค่ toast ทั่วไป
- [ ] Audit log page: ตาราง audit events filter ตาม date/action/actor
- [ ] ปุ่ม "Verify Chain" → แสดงผล valid/broken พร้อม entry ID ที่เสีย
- [ ] PDPA page: list requests + approve/reject button (admin only)
- [ ] PDPA request detail: แสดง status timeline (submitted → approved → completed)

**Dev B รวม checklist: ~68 items**

---

## 📋 Shared Handoff Checkpoints (สำคัญมาก)

| Dev A Publishes | Dev B Unblocked |
|---|---|
| DEVA-01 merged (enums ready) | Dev B เริ่ม DEVB-01 ได้ |
| DEVA-02: `GET /auth/me` contract | Dev B ใช้ auth shell ได้จริง |
| DEVA-03: `/websites`, `/rounds` contract | Dev B ทำ form + round assign ได้ |
| DEVA-04: scoring/ranking contract | Dev B ทำ dashboard UI ได้ |

## 🚀 Pre-Merge Checklist (ทุก PR ต้องผ่าน)
- [ ] ไม่มี `console.log` ใน production code
- [ ] ไม่มี hardcoded credentials หรือ PSU secret
- [ ] `.env.example` update ถ้าเพิ่ม env var ใหม่
- [ ] `docs/design/api-contracts.md` สะท้อน behavior ปัจจุบัน
- [ ] SRS2.1 section ที่เกี่ยวข้องถูก cross-reference ใน PR description
- [ ] มี test coverage สำหรับ happy path + อย่างน้อย 1 error case
