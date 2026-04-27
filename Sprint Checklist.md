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

### Dependency Chain
DB Schema → Auth/Session → Role Policy → Core CRUD → Scheduler → Scoring Engine → Dashboard UI → Reports
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
Mangkorn → feature/core-<domain>
TEN      → feature/ux-<domain>
Shared   → feature/shared-<topic>  (requires both reviewers)
### PR Rules
- Max 500 LOC per PR, 1 domain per PR
- Contract-first: API/schema PR merged ก่อน UI PR ออกจาก draft
- Shared file changes ต้องให้อีก dev review ก่อนเสมอ

---

## 🔄 วิธี Push งานขึ้น GitHub (ทำทุกครั้งที่ task เสร็จ)

เขียน Code ──► git add ──► git commit ──► git push ──► เปิด PR ──► รอ Review ──► Merge เข้า develop
### ขั้นตอนละเอียด

**Step 1 — sync develop ล่าสุดก่อนเสมอ**
```bash
git fetch origin
git checkout feature/core-xxx      # เปลี่ยนเป็น branch ของตัวเอง
git rebase origin/develop
Step 2 — เพิ่มไฟล์และ commitgit status                         # ดูไฟล์ที่เปลี่ยน
git add .                          # หรือ git add <ชื่อไฟล์>
git commit -m "feat(auth): add JWT rotation with reuse detection"
Step 3 — push ขึ้น remotegit push origin feature/core-xxx
Step 4 — เปิด Pull Request บน GitHubGitHub → Pull Requests → New Pull Request
Base:    develop
Compare: feature/core-xxx
Step 5 — เขียน PR Description## What
- อธิบายว่าทำอะไรใน PR นี้

## SRS Reference
- SRS2.1 Section X.X

## Checklist
- [x] Tests ผ่าน
- [x] ไม่มี console.log
- [x] api-contracts.md อัปเดตแล้ว (ถ้ามี endpoint ใหม่)
Step 6 — Assign ReviewerMangkorn เปิด PR → Assign TEN เป็น Reviewer
TEN เปิด PR      → Assign Mangkorn เป็น Reviewer
Step 7 — หลัง Reviewer Approve → MergeGitHub → Pull Request → Squash and Merge → Confirm

⚠️ ห้าม push ตรงเข้า develop หรือ main เด็ดขาด — ต้องผ่าน PR เท่านั้น
👤 MANGKORN — Core Platform Lead
Auth · Website · Round · Scoring
🎓 ได้เรียน: OAuth2 security, Drizzle schema, Fastify API, Scoring algorithm, React Dashboard
Branch pattern: feature/core-<domain>
❌ Mangkorn ห้ามแตะweb/app/**
web/components/**
docs/design/component-tree.md
MANGKORN-01 · Base Schema Foundation
Branch: feature/core-base-schema
🎓 ได้เรียน: Drizzle ORM, PostgreSQL enum, migration
Files to create:db/schema/enums.ts
db/migrations/0001_base_enums.ts
Checklist:
 อ่าน SRS2.1.md section Entity & Role ก่อน implement
 Define enums: role, round_status, form_status, field_type, notif_status, website_status
 Enum values ตรงกับ SRS2.1 ทุกตัว — ห้ามเดาหรือ rename เอง
 drizzle-kit migrate รันผ่านโดยไม่มี warning
 เขียน comment อธิบาย enum แต่ละตัวว่าใช้ตอนไหน
📤 Push เมื่อเสร็จ:# Step 1 — Sync
git fetch origin
git checkout feature/core-base-schema
git rebase origin/develop

# Step 2 — Commit
git add db/schema/enums.ts db/migrations/0001_base_enums.ts
git commit -m "schema(enums): add all base enums per SRS2.1"

# Step 3 — Push
git push origin feature/core-base-schema

# Step 4 — เปิด PR: feature/core-base-schema → develop
# Step 5 — Assign TEN เป็น Reviewer
# Step 6 — หลัง Approve → Squash and Merge
# Step 7 — แจ้ง TEN ว่า merge แล้ว เพื่อให้เริ่ม TEN-01 ได้ ✅
MANGKORN-02 · Auth — Full Stack
Depends on: MANGKORN-01 | Branch: feature/core-auth
🎓 ได้เรียน: OAuth2+PKCE, JWT rotation, Fastify middleware, Next.js App Router
Backend files to create:db/schema/users.ts
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
Frontend files to create:web/app/(public)/login/page.tsx
web/app/(public)/callback/page.tsx
web/components/AppShell/AppShell.tsx
web/components/AppShell/Sidebar.tsx
web/lib/auth/AuthContext.tsx
web/lib/auth/useAuth.ts
web/middleware.ts
Checklist — Backend:
 อ่าน SRS2.1 Auth section ก่อน implement
 Schema: users (id, psu_passport_id, role, faculty_id, created_at)
 Schema: sessions (id, user_id, refresh_token_hash, expires_at, revoked_at)
 Migration รันผ่าน + FK sessions → users
 OAuth2 callback: แลก code → access token จาก PSU Passport
 JWT access token (TTL 15 นาที) + refresh token (TTL 7 วัน)
 Refresh rotation: revoke old refresh token ทุกครั้ง
 Reuse detection: refresh token ที่ revoke แล้ว → revoke-all sessions
 POST /auth/revoke-all ทำงานถูกต้อง
 OTP override: single-use + expire ใน 5 นาที
 Rate limit: auth endpoints 10 req/min per IP
 CSRF token required สำหรับ mutating routes
 Role policy enforce ใน authorize.ts ตาม SRS2.1 role matrix
 Integration test: login → refresh → revoke-all → old token rejected
Checklist — Frontend:
 /login: ปุ่ม "เข้าสู่ระบบด้วย PSU Passport" redirect ไป OAuth2
 /callback: รับ code, เรียก API, เก็บ JWT ใน httpOnly cookie
 AuthContext.tsx: provide user, role, isLoading, logout
 useAuth() hook: redirect ถ้าไม่มี session
 web/middleware.ts: guard ทุก route ใน (auth)/**
 Sidebar render menu ตาม role
 Logout: clear cookie + redirect /login
 Loading skeleton ระหว่างดึง session
 ⚠️ Publish GET /auth/me shape → docs/design/api-contracts.md
📤 Push เมื่อเสร็จ:# Step 1 — Sync
git fetch origin
git checkout feature/core-auth
git rebase origin/develop

# Step 2 — Commit แยก backend / frontend
git add db/schema/ db/migrations/ api/src/modules/auth/ api/src/middleware/
git commit -m "feat(auth): implement OAuth2+PKCE, JWT rotation, reuse detection"

git add web/app/ web/components/AppShell/ web/lib/auth/ web/middleware.ts
git commit -m "feat(auth): add login page, callback, AuthContext, sidebar"

# Step 3 — Push
git push origin feature/core-auth

# Step 4 — เปิด PR: feature/core-auth → develop
# Step 5 — Assign TEN เป็น Reviewer
# Step 6 — หลัง Approve → Squash and Merge
# Step 7 — อัปเดต api-contracts.md แล้วแจ้ง TEN ✅
MANGKORN-03 · Website Registry + Rounds — Full Stack
Depends on: MANGKORN-02 | Branch: feature/core-website-round
🎓 ได้เรียน: Relational schema, REST CRUD, dynamic routes, React Table
Backend files to create:db/schema/websites.ts
db/schema/rounds.ts
db/migrations/0003_website_round.ts
api/src/modules/websites/websites.handler.ts
api/src/modules/websites/websites.service.ts
api/src/modules/rounds/rounds.handler.ts
api/src/modules/rounds/rounds.service.ts
Frontend files to create:web/app/(auth)/websites/page.tsx
web/app/(auth)/websites/[id]/page.tsx
web/app/(auth)/rounds/page.tsx
web/app/(auth)/rounds/[id]/page.tsx
web/components/shared-ui/DataTable.tsx
web/components/shared-ui/FilterBar.tsx
web/components/shared-ui/ConfirmDialog.tsx
Checklist — Backend:
 Schema: websites (id, name, url, faculty_id, status, last_checked_at)
 Schema: rounds (id, name, faculty_id, status, open_at, close_at)
 Schema: round_websites junction (round_id, website_id)
 Migration รันผ่าน + unique constraint (1 website ต่อ 1 round)
 URL validation ตอน create/update website
 POST/GET/PATCH/DELETE /websites พร้อม faculty_scope filter
 POST/GET/PATCH/DELETE /rounds พร้อม lifecycle (draft→open→closed)
 Cross-faculty leak test: faculty A → ดึง faculty B → 403
 Integration test: round lifecycle ครบ
 ⚠️ Publish /websites, /rounds shapes → docs/design/api-contracts.md
Checklist — Frontend:
[ ]
