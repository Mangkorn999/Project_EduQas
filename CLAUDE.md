# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**eila** — Website Evaluation System (ระบบประเมินคุณภาพเว็บไซต์หน่วยงาน) for Prince of Songkla University (PSU). Built by สำนักการศึกษาและนวัตกรรมการเรียนรู้ (EILA) for evaluating PSU faculty/unit websites via structured surveys, weighted scoring, ranking, and reports.

**Status:** Phase 1 implementation complete (monorepo scaffolded, backend + frontend core features working).

### Working documents

| File | Purpose |
|------|---------|
| `SRS2.1.md` | **Current authoritative SRS** (supersedes SRS2.0) |
| `docs/Sprint Checklist.md` | Task breakdown, file ownership, developer assignments |
| `docs/Git Branching Strategy.md` | Branch naming, PR rules, shared file policies |
| `docs/design/` | System design artifacts (architecture, DB, API, auth, UI, deployment, scoring, data lifecycle, security) |
| `docs/archive/` | Superseded SRS versions — keep for history only |

Always read `SRS2.1.md` + `docs/Sprint Checklist.md` before starting work.

## Tech Stack (Implemented)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router + Tailwind CSS + dnd-kit + React Hook Form + Zod |
| Backend | Fastify + Node.js + TypeScript + pnpm workspaces |
| Database | PostgreSQL + Drizzle ORM |
| Auth | PSU Passport (OAuth 2.0 + PKCE) + JWT access (15 min) + refresh rotation (7 d, HttpOnly cookie) |
| Scheduler | node-cron (Asia/Bangkok timezone) |
| Export | pdf-lib + ExcelJS |
| Email | Nodemailer via PSU SMTP |
| Validation | Zod schemas (FE + BE shared) |

## Architecture Overview

### User Roles (6 total)

Per SRS2.1 §2.3:

- `super_admin` — system-wide admin; manages users, faculties, global templates, university-scope forms and rounds.
- `admin` — per-faculty admin; manages own faculty's websites, forms, rounds, and faculty templates.
- `executive` — read-only cross-faculty dashboards and ranking.
- `teacher` / `staff` / `student` — respondents; auto-provisioned on first PSU Passport login.

No public / anonymous respondents (SRS2.1 §1.2 exclusion).

### Scopes

- **Form scope** — `faculty` or `university`.
- **Template scope** — `faculty` or `global`.
- **Round scope** — `faculty` or `university`.

### Auth Flow

PSU Passport OAuth 2.0 + PKCE → JWT access token (15 min) + hashed refresh token (7 d, HttpOnly cookie, atomic rotation, reuse detection triggers revoke-all). Idle timeout 30 min; absolute 8 h. Email OTP required for `super_admin` role overrides (FR-AUTH-15/20). See `docs/design/auth-flow.md`.

## Phase Status

| Phase | Status | Coverage |
|-------|--------|----------|
| **Phase 1** | ✅ Complete | Auth, Website Registry, Evaluation Rounds, Form Builder (drag-drop, versioning, rollback), Criteria presets, Evaluator view (website-open gate, draft autosave), Response submission, basic Dashboard, JSON + Excel export, Audit (SHA-256 hash chain), PDPA workflow, Scheduler (4 cron jobs: round-open, round-close, reminder, url-check), Backup / DR |
| **Phase 2** | 🔄 Pending | Ranking (Top 10 / Bottom 5 / Most Improved / Percentile), full Score Card, per-website PDF report, email delivery status, Trend, Faculty heatmap |
| **Phase 3** | 📋 Planned | Conditional logic, auto-screenshot, AI summary, Public API, multi-language, advanced analytics, benchmarking |

Design docs tag sections with `[P1]` / `[P2]` / `[P3]`.

## File Ownership

| Developer | Owns | Never Touch |
|-----------|------|-------------|
| **Mangkorn** (Core Platform Lead) | `backend/api/src/modules/{auth,users,websites,rounds,scoring,audit,pdpa}/**`, `backend/db/schema/**`, `backend/db/migrations/**`, `docs/design/db-schema.md`, `docs/design/scoring-and-ranking.md` | `web/app/**`, `web/components/**`, `docs/design/component-tree.md` |
| **TEN** (Product Experience Lead) | `web/app/**`, `web/components/**`, `backend/api/src/modules/{forms,responses,notifications}/**`, `docs/design/component-tree.md` | `backend/db/schema/**`, `backend/db/migrations/**`, `backend/api/src/modules/auth/**` |

Shared files (both must review): `SRS2.1.md`, `docs/design/api-contracts.md`, `.env.example`, `packages/shared/schemas/**`

## Git Branch Strategy

```
main                               ← production only, protected
└── develop                        ← integration branch (staging)
    ├── feature/core-*             ← Mangkorn (auth, schema, scoring)
    ├── feature/ux-*               ← TEN (UI, forms, evaluator)
    └── feature/shared-*           ← both must review
```

Rules:
- `develop` → `main`: merge commit (preserve history)
- `feature/*` → `develop`: squash merge (clean history)
- PR size < 500 LOC; 1 domain per PR
- Contract-first: API/schema PR merged before dependent UI PR

See `docs/Git Branching Strategy.md` for full workflow.
