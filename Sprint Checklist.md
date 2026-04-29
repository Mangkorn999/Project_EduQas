# 🎓 EILA — AI Sprint Checklist
> **Project:** EILA (PSU Internal Website Evaluation Platform)
> **Stack:** Next.js 14 / Fastify / TypeScript / PostgreSQL / Drizzle ORM
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

### Project Status
- ✅ Monorepo scaffolded: `backend/api`, `backend/db`, `web`
- ✅ Phase 1 backend complete — all core modules implemented
- ✅ Phase 1 frontend scaffolded — key pages in place
- Design docs in `docs/design/` — `SRS2.1.md` still source of truth

### Dependency Chain
DB Schema → Auth/Session → Role Policy → Core CRUD → Scheduler → Scoring Engine → Dashboard UI → Reports
### Current Blockers
- [x] TEN-03 scheduler/cron jobs — backend implementation complete
- [ ] TEN-04 export services (PDF/XLSX) — backend implementation pending
- [ ] Frontend auth UI — login/callback pages not yet created
- [ ] Dashboard/Ranking UI — waiting on frontend implementation

### Shared Files — Handle With Care
| File | Rule |
|---|---|
| `SRS2.1.md` | Change-control only — ทั้งคู่ต้อง approve |
| `docs/design/api-contracts.md` | One active writer per day |
| `docs/design/db-schema.md` | Mangkorn เขียน, TEN reviews |
| `docs/design/scoring-and-ranking.md` | Mangkorn เขียน, TEN consumes |
| `packages/shared/schemas/*` | Mangkorn proposes → TEN integrates |
| `db/migrations/*` | Mangkorn ONLY — TEN ห้ามแตะเด็ดขาด |

### Branch Naming Convention
Mangkorn → feature/core-<domain>     e.g. feature/core-auth, feature/core-scoring
TEN      → feature/ux-<domain>       e.g. feature/ux-evaluator, feature/ux-dashboard
Shared   → feature/shared-<topic>    (requires both reviewers)

### Current Branch Status
| Branch | Status | Notes |
|---|---|---|
| `main` | ✅ Production | Latest stable |
| `develop` | ✅ Integration | All merged features |
| `feature/core-auth` | ✅ Merged | MANGKORN-02 |
| `feature/core-base-schema` | ✅ Merged | MANGKORN-01 |
| `feature/core-website-round` | ✅ Merged | MANGKORN-03 |
| `feature/core-scoring` | ✅ Merged | MANGKORN-04 |
| `feature/ux-forms` | ✅ Merged | TEN-01 |
| `feature/ux-evaluator` | ✅ Merged | TEN-02 |
| `feature/ux-audit` | ✅ Merged | RBAC foundation |
| `feature/ux-audit-pdpa` | 🟡 Active | TEN-04 frontend scaffold |
| `feature/ux-notifications` | ✅ Merged | TEN-03 Backend Complete |
| `feature/email-retry-service` | ✅ Merged | Phase C Complete |
### PR Rules
- Max 500 LOC per PR, 1 domain per PR
- Contract-first: API/schema PR merged before dependent UI PR exits draft
- Shared file changes ต้องให้อีก dev review ก่อนเสมอ

---
---

# 👤 MANGKORN — Core Platform Lead
> Auth · Website · Round · Scoring
> 🎓 ได้เรียน: OAuth2 security, Drizzle schema design, Fastify API, Scoring algorithm, React Dashboard
> **Branch pattern:** `feature/core-<domain>`

## File Ownership
backend/api/src/modules/auth/**            ← Mangkorn only
backend/api/src/modules/users/**           ← Mangkorn only
backend/api/src/modules/websites/**        ← Mangkorn only
backend/api/src/modules/rounds/**          ← Mangkorn only
backend/api/src/modules/scoring/**         ← Mangkorn owns logic, TEN consumes via API
backend/api/src/middleware/**              ← Mangkorn only
backend/db/schema/**                       ← Mangkorn only
backend/db/migrations/**                   ← Mangkorn ONLY — ห้าม TEN แตะ
packages/shared/schemas/**         ← Mangkorn proposes
docs/design/db-schema.md           ← Mangkorn primary
docs/design/scoring-and-ranking.md ← Mangkorn primary
## ❌ Mangkorn ห้ามแตะ
web/app/**
web/components/**
docs/design/component-tree.md
---

## MANGKORN-01 · Base Schema Foundation
> Depends on: nothing | Branch: `feature/core-base-schema` ✅ MERGED
> 🎓 ได้เรียน: Drizzle ORM, PostgreSQL enum, migration

**Files created:**
backend/db/schema/enums.ts
backend/db/migrations/0000_0000_base_enums.sql
**Checklist:**
- [x] อ่าน `SRS2.1.md` section Entity & Role ก่อน implement
- [x] Define enums: `role`, `round_status`, `form_status`, `field_type`, `notif_status`, `website_status`
- [x] Enum values ต้องตรงกับ SRS2.1 ทุกตัว — ห้ามเดาหรือ rename เอง
- [x] `drizzle-kit migrate` รันผ่านโดยไม่มี warning
- [x] เขียน comment อธิบาย enum แต่ละตัวว่าใช้ตอนไหน
- [x] แจ้ง TEN ทันทีที่ merge เพื่อให้เริ่ม TEN-01 ได้

---

## MANGKORN-02 · Auth — Full Stack
> Depends on: MANGKORN-01 | Branch: `feature/core-auth` ✅ MERGED
> 🎓 ได้เรียน: OAuth2+PKCE, JWT rotation, Fastify middleware, Next.js App Router, useContext

**Backend files created:**
backend/db/schema/users.ts
backend/db/schema/sessions.ts (refresh_tokens)
backend/db/migrations/0002_0001_auth.sql
backend/api/src/modules/auth/oauth.handler.ts
backend/api/src/modules/auth/session.service.ts
backend/api/src/modules/auth/token.service.ts
backend/api/src/modules/auth/otp.service.ts
backend/api/src/middleware/authenticate.ts
backend/api/src/middleware/authorize.ts
backend/api/src/modules/security/csrf.middleware.ts
backend/api/src/modules/security/ratelimit.middleware.ts
**Frontend files to create:**
web/app/(public)/login/page.tsx
web/app/(public)/callback/page.tsx
web/components/AppShell/AppShell.tsx
web/components/AppShell/Sidebar.tsx
web/lib/auth/AuthContext.tsx
web/lib/auth/useAuth.ts
web/middleware.ts
**Checklist — Backend:**
- [x] อ่าน SRS2.1 Auth section ก่อน implement
- [x] Schema: `users` table (id, psu_passport_id, role, faculty_id, created_at)
- [x] Schema: `sessions` table (id, user_id, refresh_token_hash, expires_at, revoked_at)
- [x] Migration รันผ่าน + FK constraint sessions → users
- [x] OAuth2 callback: แลก `code` → access token จาก PSU Passport
- [x] ออก JWT access token (TTL 15 นาที) + refresh token (TTL 7 วัน)
- [x] Refresh rotation: revoke old refresh token ทุกครั้งที่ขอ token ใหม่
- [x] Reuse detection: ถ้าใช้ refresh token ที่ revoke แล้ว → revoke-all sessions ของ user นั้น
- [x] `POST /auth/revoke-all` ทำงานถูกต้อง
- [x] OTP override: single-use + expire ใน 5 นาที
- [x] Rate limit: auth endpoints จำกัด 10 req/min per IP
- [x] CSRF token required สำหรับ mutating routes
- [x] Role policy enforce ใน `authorize.ts` ตาม SRS2.1 role matrix
- [ ] Integration test: login → refresh → revoke-all → old token rejected

**Checklist — Frontend:**
- [ ] `/login` page: ปุ่ม "เข้าสู่ระบบด้วย PSU Passport" redirect ไป OAuth2
- [ ] `/callback` page: รับ `code`, เรียก API, เก็บ JWT ใน httpOnly cookie
- [ ] `AuthContext.tsx`: provide `user`, `role`, `isLoading`, `logout`
- [ ] `useAuth()` hook: consume AuthContext, redirect ถ้าไม่มี session
- [ ] `web/middleware.ts`: guard ทุก route ใน `(auth)/**`
- [ ] Sidebar render menu items ตาม role
- [ ] Logout: clear cookie + redirect `/login`
- [ ] Loading skeleton ระหว่างดึง user session
- [x] ⚠️ **Publish** `GET /auth/me` response shape → `docs/design/api-contracts.md` ให้ TEN

---

## MANGKORN-03 · Website Registry + Rounds — Full Stack
> Depends on: MANGKORN-02 | Branch: `feature/core-website-round` ✅ MERGED
> 🎓 ได้เรียน: Relational schema, REST CRUD, Next.js dynamic routes, React Table

**Backend files created:**
backend/db/schema/websites.ts
backend/db/schema/rounds.ts
backend/db/migrations/0003_tan_cannonball.sql
backend/api/src/modules/websites/websites.handler.ts
backend/api/src/modules/websites/websites.service.ts
backend/api/src/modules/rounds/rounds.handler.ts
backend/api/src/modules/rounds/rounds.service.ts
**Frontend files to create:**
web/app/(auth)/websites/page.tsx
web/app/(auth)/websites/[id]/page.tsx
web/app/(auth)/rounds/page.tsx
web/app/(auth)/rounds/[id]/page.tsx
web/components/shared-ui/DataTable.tsx
web/components/shared-ui/FilterBar.tsx
web/components/shared-ui/ConfirmDialog.tsx
**Checklist — Backend:**
- [x] Schema: `websites` (id, name, url, faculty_id, status, last_checked_at)
- [x] Schema: `rounds` (id, name, faculty_id, status, open_at, close_at)
- [x] Schema: `round_websites` junction table (round_id, website_id)
- [x] Migration รันผ่าน + unique constraint (1 website ต่อ 1 round)
- [x] URL validation: ตรวจ format ตอน create/update
- [x] `POST/GET/PATCH/DELETE /websites` พร้อม faculty_scope filter
- [x] `POST/GET/PATCH/DELETE /rounds` พร้อม lifecycle (draft→open→closed)
- [ ] Cross-faculty leak test: faculty A → ดึงข้อมูล faculty B → 403
- [ ] Integration test: round lifecycle ครบ

**Checklist — Frontend:**
- [ ] Websites page: ตาราง list, search/filter, add/edit/delete
- [ ] Reuse `DataTable.tsx` สำหรับ pagination + sort + filter
- [ ] Confirm dialog ก่อน delete ทุกครั้ง
- [ ] Rounds page: ตาราง list, สร้าง round พร้อม date range picker
- [ ] Round detail page: assign websites เข้า round (multi-select)
- [ ] Status badge แสดงสีตาม status (draft=gray, open=green, closed=red)
- [ ] Form submit ใช้ React Hook Form + Zod
- [ ] Error message จาก API แสดงใต้ field ที่ผิด
- [x] ⚠️ **Publish** `/websites`, `/rounds` API shapes → `docs/design/api-contracts.md`

---

## MANGKORN-04 · Scoring Engine + Dashboard UI — Full Stack
> Depends on: TEN-02 (responses API) | Branch: `feature/core-scoring` ✅ MERGED
> 🎓 ได้เรียน: Algorithm design, deterministic testing, Recharts, data visualization

**Backend files created:**
backend/api/src/modules/scoring/score.service.ts
backend/api/src/modules/scoring/weight.service.ts
backend/api/src/modules/ranking/eligibility.service.ts
backend/api/src/modules/ranking/ranking.service.ts
backend/api/src/modules/ranking/ranking.handler.ts
backend/api/src/modules/dashboard/dashboard.handler.ts
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
- [x] อ่าน `docs/design/scoring-and-ranking.md` ก่อนทุกบรรทัด
- [x] Weighted score: `Σ(field_score × weight) / Σ(weights)` ตรงตาม spec
- [x] Websites ที่ response ไม่ถึง threshold → `excluded_low_response = true`
- [x] Tie-break deterministic (input เดิม → rank เดิมเสมอ)
- [x] `GET /rankings/:roundId` return ranked list + eligibility flags
- [x] `GET /websites/:id/scorecard` return per-criterion breakdown
- [x] `GET /dashboard/overview` return summary stats
- [x] Golden dataset test: fixed input → assert exact output (snapshot test)
- [x] Edge case: all tied, all excluded, zero responses, single respondent
- [x] ⚠️ **Publish** scoring/ranking API shapes → `docs/design/api-contracts.md` ให้ TEN

**Checklist — Frontend:**
- [ ] Overview cards: ยอด evaluated, avg score, top-ranked, pending
- [ ] Trend chart (line) ใช้ Recharts
- [ ] Heatmap: criteria × website score grid
- [ ] Ranking table: rank, website, score, response count, exclusion badge
- [ ] `ExclusionBadge`: แสดง reason ที่อ่านเข้าใจได้
- [ ] Scorecard panel: per-criterion breakdown + weight
- [ ] Executive page: cross-round comparison
- [ ] `NEXT_PUBLIC_USE_FIXTURE=true` โหลด static JSON แทน API
- [ ] ทุก chart มี data table สำรอง (accessibility)
- [ ] Empty state: ข้อความเป็นมิตรเมื่อไม่มี response

---
---

# 👤 TEN — Product Experience Lead
> Forms · Evaluator · Notifications · Audit
> 🎓 ได้เรียน: Complex schema relations, Form system, Background jobs, Audit/compliance, dnd-kit UI
> **Branch pattern:** `feature/ux-<domain>`

## File Ownership
web/app/(public)/**                ← TEN only
web/app/(auth)/dashboard/**        ← TEN only
web/app/(auth)/evaluator/**        ← TEN only
web/app/(auth)/executive/**        ← TEN only
web/app/(auth)/reports/**          ← TEN only
web/app/(auth)/forms/**            ← TEN only
web/app/(auth)/admin/**            ← TEN only
web/app/(auth)/notifications/**    ← TEN only
web/components/form-builder/**     ← TEN only
web/components/import-export/**    ← TEN only
web/components/shared-ui/**        ← TEN only
docs/design/component-tree.md      ← TEN primary
## ❌ TEN ห้ามแตะ
backend/api/src/modules/**
backend/db/schema/**
backend/db/migrations/**                   ← ห้ามเด็ดขาด — Mangkorn only
docs/design/db-schema.md
docs/design/scoring-and-ranking.md
---

## TEN-01 · Form Builder — Full Stack
> Depends on: MANGKORN-01 (enums), MANGKORN-03 (rounds schema) | Branch: `feature/ux-forms` ✅ MERGED
> 🎓 ได้เรียน: Schema versioning, Fastify API, dnd-kit, React Hook Form

**Backend files created:**
backend/db/schema/forms.ts
backend/db/schema/templates.ts
backend/db/migrations/0004_scoring_forms_responses.sql
backend/api/src/modules/forms/forms.handler.ts
backend/api/src/modules/forms/forms.service.ts
backend/api/src/modules/forms/snapshot.service.ts
backend/api/src/modules/forms/questions.service.ts
backend/api/src/modules/forms/criteria.service.ts
**Frontend files created:**
web/app/(auth)/forms/page.tsx
web/app/(auth)/forms/[id]/builder/page.tsx
web/app/(auth)/forms/[id]/versions/page.tsx
web/components/form-builder/FormBuilder.tsx
web/components/form-builder/DragDropCanvas.tsx
web/components/form-builder/FieldEditor.tsx
web/components/form-builder/WeightInput.tsx
**Checklist — Backend:**
- [x] อ่าน SRS2.1 Form Builder section ก่อน implement
- [x] Schema: `forms` (id, round_id, title, status, created_by)
- [x] Schema: `form_fields` (id, form_id, field_type, label, order, weight, config jsonb)
- [x] Schema: `form_versions` (id, form_id, snapshot jsonb, version_number, created_at)
- [x] Migration รันผ่าน + FK form_fields → forms, form_versions → forms
- [x] Support field types ครบ 10 ตาม SRS2.1: text, textarea, radio, checkbox, rating, scale, date, file, number, select
- [x] `POST/GET/PATCH/DELETE /forms` พร้อม faculty_scope filter
- [x] `POST /forms/:id/publish` → สร้าง immutable snapshot ใน `form_versions`
- [x] `GET /forms/:id/versions` → list snapshots ทั้งหมด
- [x] `POST /forms/:id/versions/:versionId/rollback` → restore snapshot
- [x] ห้าม edit published form โดยตรง — ต้อง clone เป็น draft ก่อน
- [ ] Integration test: publish → rollback → re-publish ครบ cycle
- [x] ⚠️ **Publish** `/forms`, `/form_fields` shapes → `docs/design/api-contracts.md`

**Checklist — Frontend:**
- [x] Forms list page: แสดงทุก form พร้อม status badge
- [x] Form Builder: drag-and-drop reorder fields ด้วย `dnd-kit`
- [x] Field Editor panel: กด field → แก้ label, required toggle, help text, options
- [x] `WeightInput.tsx`: กรอก weight + แสดง live sum (ควรรวมได้ 100%)
- [ ] Warning ถ้า weight sum ≠ 100 ก่อน publish
- [ ] Publish confirm dialog แจ้งว่า snapshot จะถูกสร้าง
- [x] Versions page: timeline ของทุก version พร้อมปุ่ม Rollback
- [ ] Rollback confirm dialog แจ้ง warning ว่า draft จะถูกแทนที่
- [x] Form state managed ด้วย React Hook Form + Zod

---

## TEN-02 · Evaluator Flow — Full Stack
> Depends on: TEN-01 (forms API), MANGKORN-03 (rounds API) | Branch: `feature/ux-evaluator` ✅ MERGED
> 🎓 ได้เรียน: Event sourcing, API state machine, Form rendering, UX soft gate

**Backend files created:**
backend/db/schema/responses.ts
backend/db/schema/evaluator_assignments.ts
backend/db/migrations/0005_cloudy_switch.sql
backend/api/src/modules/responses/responses.handler.ts
backend/api/src/modules/responses/responses.service.ts
backend/api/src/modules/assignments/assignments.handler.ts
backend/api/src/modules/assignments/assignments.service.ts
**Frontend files created:**
web/app/(auth)/evaluator/page.tsx
web/app/(auth)/evaluator/evaluate/[websiteId]/form/page.tsx
web/app/(auth)/evaluator/evaluate/[websiteId]/gate/page.tsx
web/app/(auth)/evaluator/evaluate/[websiteId]/success/page.tsx
web/app/(auth)/evaluator/_shared.tsx
**Frontend components to create:**
web/components/form-runner/FormRunner.tsx
web/components/form-runner/FieldRenderer.tsx
web/components/form-runner/WebsiteGate.tsx
web/components/form-runner/SubmitGuard.tsx
**Checklist — Backend:**
- [x] อ่าน SRS2.1 Evaluator Flow section ก่อน implement
- [x] Schema: `evaluator_assignments` (id, user_id, round_id, website_id)
- [x] Schema: `responses` (id, assignment_id, form_version_id, status, submitted_at)
- [x] Schema: `response_events` (id, response_id, type, created_at)
- [x] Migration รันผ่าน + FK chain assignment → response → events
- [x] `GET /evaluator/assignments` → list งานที่ assign ให้ user นั้น
- [x] `POST /responses` → create draft response
- [x] `PATCH /responses/:id` → save/update answers (เฉพาะก่อน round close)
- [ ] `POST /responses/:id/events` → record `website_opened` / `submitted`
- [ ] Submit validation: ต้องมี `website_opened` event → ถ้าไม่มี return 422
- [ ] Round closed → PATCH/submit ไม่ได้ → return 409
- [ ] Integration test: submit without website-open → 422
- [ ] Integration test: submit after round close → 409
- [ ] Integration test: save draft → reopen → continue → submit ครบ

**Checklist — Frontend:**
- [x] Evaluator home: list assignments พร้อม status (not started/in progress/submitted)
- [x] กด website link → เปิด tab ใหม่ + fire `POST /responses/:id/events { type: website_opened }`
- [ ] `WebsiteGate.tsx`: Submit disabled + tooltip "กรุณาเปิดเว็บไซต์ก่อนส่งคำตอบ"
- [ ] Submit enable เฉพาะหลัง `website_opened` event confirmed
- [ ] `FieldRenderer.tsx` render ครบ 10 field types ตาม form_version snapshot
- [x] Form state ใช้ React Hook Form + Zod
- [ ] บันทึก draft อัตโนมัติ (debounce 2 วินาที)
- [ ] Round closed → form read-only ทุก field ไม่มีปุ่ม submit
- [ ] Loading skeleton ระหว่างโหลด form
- [ ] Error แสดง requestId สำหรับ support

---

## TEN-03 · Notifications — Full Stack
> Depends on: TEN-02 | Branch: `feature/ux-notifications`
> 🎓 ได้เรียน: Background job, Retry pattern, node-cron, React UI pattern

**Backend files created:**
backend/db/schema/notifications.ts
backend/db/migrations/0006_massive_tattoo.sql
backend/api/src/modules/notifications/email.service.ts
backend/api/src/modules/notifications/notifications.handler.ts
backend/api/src/modules/notifications/notifications.service.ts
**Backend files to create:**
api/src/modules/scheduler/cron.registry.ts
api/src/modules/scheduler/jobs/reminder.job.ts
api/src/modules/scheduler/jobs/round-open.job.ts
api/src/modules/scheduler/jobs/round-close.job.ts
api/src/modules/scheduler/jobs/url-check.job.ts
**Frontend files created:**
web/app/(auth)/notifications/page.tsx
**Frontend components to create:**
web/components/notifications/NotificationBell.tsx
web/components/notifications/NotificationPanel.tsx
web/app/(auth)/notifications/delivery-status/page.tsx
**Checklist — Backend:**
- [x] อ่าน SRS2.1 Notification + Scheduler section ก่อน implement
- [x] Schema: `notifications` (id, user_id, type, title, body, status, ref_id, created_at)
- [x] Migration รันผ่าน + index on (user_id, status)
- [x] `CRON_ENABLED=true` guard ที่ startup — cron รันได้แค่ 1 instance
- [x] ทุก cron job เป็น idempotent (รันซ้ำ 2 ครั้ง ได้ผลเหมือนกัน)
- [x] Idempotency key ต่อ job execution เก็บใน DB
- [x] round-open job: เปลี่ยน round_status → open + สร้าง in-app notification
- [x] round-close job: เปลี่ยน → closed + ส่ง email
- [x] url-check job: ping URL + update `availability_status` + `last_checked_at`
- [x] reminder job: ส่ง notif ให้ evaluator ที่ยังไม่ submit
- [x] Email service: SMTP, template-based (Mocked with console log, Phase C ready)
- [x] Retry: max 3 ครั้ง, exponential backoff (1m, 5m, 15m), `status = 'sent'` หลังหมด (Phase C)
- [x] `GET /notifications` return list สำหรับ current user
- [x] `PATCH /notifications/:id/read` mark as read
- [x] `PATCH /notifications/read-all` mark all as read
- [x] `POST /notifications/:id/resend` resend failed notification
- [x] Test: รัน job ซ้ำ 2 ครั้ง → ไม่มี duplicate notification
- [x] Test: retry exhaust → `status = 'failed'` confirmed (After 4th attempt)

**Checklist — Frontend:**
- [ ] `NotificationBell.tsx`: badge unread count, กดเปิด panel
- [ ] `NotificationPanel.tsx`: list, กดอ่าน → mark as read, "อ่านทั้งหมด"
- [ ] Unread count refetch เมื่อเปิด panel
- [ ] Delivery Status page: ตาราง sent notifications + status column
- [ ] Resend button: optimistic update → pending → success/fail
- [ ] Failed row แสดง error reason จาก API

---

## TEN-04 · Audit/PDPA + Import/Export — Full Stack
> Depends on: TEN-02 | Branch: `feature/ux-audit-pdpa`
> 🎓 ได้เรียน: Hash chain, PDPA compliance, File processing, PDF/XLSX generation

**Progress Notes:**
- Backend audit + PDPA schemas implemented — `backend/db/schema/audit.ts`, `backend/db/schema/pdpa.ts`
- Backend audit service implemented — hash chain verify working
- Frontend scaffold completed in `feature/ux-audit-pdpa` (committed ba2d6a7)

**Backend files created:**
backend/db/schema/audit.ts
backend/db/schema/pdpa.ts
backend/api/src/modules/audit/audit.service.ts
backend/api/src/modules/audit/audit.handler.ts
backend/api/src/modules/pdpa/pdpa.service.ts
backend/api/src/modules/pdpa/pdpa.handler.ts
backend/api/src/modules/reports/reports.handler.ts
**Backend files to create:**
api/src/modules/export/pdf.service.ts
api/src/modules/export/excel.service.ts
api/src/modules/import/import.handler.ts
api/src/modules/import/validate.service.ts
**Frontend files created (scaffold):**
web/app/(auth)/reports/page.tsx
web/app/(auth)/admin/audit/page.tsx
web/app/(auth)/admin/pdpa/page.tsx
web/components/import-export/ImportWizard.tsx
web/components/import-export/ExportMenu.tsx
**Checklist — Backend:**
- [x] อ่าน SRS2.1 Audit + PDPA section ก่อน implement
- [x] Schema: `audit_logs` (id, prev_hash, hash, action, actor_id, target, payload, created_at)
- [x] Schema: `pdpa_requests` (id, requester_id, type, status, approved_by, completed_at)
- [x] Migration รันผ่าน + index on audit_logs.created_at
- [x] Hash chain: `hash = SHA256(prev_hash + JSON.stringify(entry_data))`
- [x] ทุก action สำคัญ (login, delete, publish, anonymize) → เขียน audit log (Phase A Complete)
- [x] `GET /audit/verify` → `{ valid: true }` หรือ `{ broken_at: entryId }`
- [x] Anonymize: แทนที่ PII (name, email, student_id) ด้วย `[ANONYMIZED]` — scores คงอยู่
- [x] PDPA flow: submit → admin approve → anonymize/purge execute
- [ ] Purge: ทำได้เฉพาะหลัง retention period + PDPA approval
- [ ] Export JSON: raw response data per round
- [ ] Export XLSX: formatted report ใช้ ExcelJS
- [ ] Export PDF: scorecard/ranking report ใช้ pdf-lib
- [ ] Import: รับ JSON/XLSX, validate schema, return error per-row
- [ ] Test: tamper entry → `GET /audit/verify` detect + report entry ID
- [ ] Test: anonymize → PII หายไป, scores ยังอยู่ครบ

**Checklist — Frontend:**
- [ ] Reports page: เลือก round → summary + ปุ่ม export (JSON/XLSX/PDF)
- [ ] `ExportMenu.tsx`: dropdown 3 format + loading spinner
- [ ] `ImportWizard.tsx`: Step 1 อัปโหลด → Step 2 preview + error per-row → Step 3 confirm
- [ ] Import error แสดงเป็น row-level inline
- [x] Audit log page: ตาราง events filter ตาม date/action/actor
- [x] ปุ่ม "Verify Chain" → แสดงผล valid/broken + entry ID ที่เสีย
- [x] PDPA page: list requests + approve/reject (admin only)
- [ ] PDPA request detail: status timeline (submitted → approved → completed)

---

## 📋 Shared Handoff Checkpoints

| Mangkorn Publishes | TEN Unblocked | Status |
|---|---|---|
| MANGKORN-01 merged (enums ready) | TEN เริ่ม TEN-01 ได้ | ✅ Done |
| MANGKORN-02: `GET /auth/me` contract | TEN ใช้ auth shell ได้จริง | ✅ Done |
| MANGKORN-03: `/websites`, `/rounds` contract | TEN ทำ form + round assign ได้ | ✅ Done |
| MANGKORN-04: scoring/ranking contract | TEN ทำ dashboard UI ได้ | ✅ Contract published |
| TEN-01: forms API | MANGKORN-04 scoring engine can consume | ✅ Done |
| TEN-02: responses API | MANGKORN-04 scoring engine can consume | ✅ Done |

## 🚀 Pre-Merge Checklist (ทุก PR ต้องผ่าน)
- [ ] ไม่มี `console.log` ใน production code
- [ ] ไม่มี hardcoded credentials หรือ PSU secret
- [ ] `.env.example` update ถ้าเพิ่ม env var ใหม่
- [ ] `docs/design/api-contracts.md` สะท้อน behavior ปัจจุบัน
- [ ] SRS2.1 section ที่เกี่ยวข้อง cross-reference ใน PR description
- [ ] มี test สำหรับ happy path + อย่างน้อย 1 error case
- [ ] Rerun `drizzle-kit check` หลังเปลี่ยน schema
- [ ] Branch name ถูกต้องตาม convention (`feature/core-*` / `feature/ux-*`)
