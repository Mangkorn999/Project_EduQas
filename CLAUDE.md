# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**eila** — Website Evaluation System (ระบบประเมินคุณภาพเว็บไซต์หน่วยงาน) for Prince of Songkla University (PSU). Built by สำนักการศึกษาและนวัตกรรมการเรียนรู้ (EILA) for evaluating PSU faculty/unit websites via structured surveys, weighted scoring, ranking, and reports.

Repo is in the **requirements + design phase** — no implementation code yet.

### Working documents

| File | Purpose |
|------|---------|
| `SRS2.0.md` | **Current authoritative SRS** |
| `docs/design/` | System design artifacts (architecture, DB, API, auth, UI, deployment, scoring, data lifecycle, security) |
| `docs/superpowers/specs/` | Brainstorming specs that drove the design folder |
| `SRS_REVIEW.md` | Review findings (drove v1.5 changes) |
| `SRS.md`, `SRSV1.7.md`, `SRS1.8.md`, `SRS1.9.md`, `SRS_v1.5.md`, `REQUIREMENTS.md` | **Superseded** — keep for history; do not rely on for current requirements |

Always read `SRS2.0.md` + `docs/design/README.md` first.

## Planned Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router + Tailwind CSS + dnd-kit + React Hook Form + Zod |
| Backend | Fastify + Node.js + TypeScript |
| Database | PostgreSQL |
| ORM | **Drizzle** — deviation from SRS2.0 (which mandates Prisma); see `docs/design/README.md` Deviations for context and SRS2.1 follow-up |
| Auth | PSU Passport (OAuth 2.0 + PKCE) + JWT access (15 min) + refresh rotation (7 d) |
| Scheduler | node-cron |
| Export | pdf-lib + ExcelJS |
| Email | Nodemailer via PSU SMTP |
| Validation | Zod schemas shared between FE and BE |

## Architecture Overview

### User Roles (6 total)

Names follow SRS2.0 Appendix C (`super_admin` / `admin`). The main SRS2.0 text still uses `eila_admin` / `faculty_admin` — that conflict is tracked for an SRS2.1 fix.

- `super_admin` (aka `eila_admin`) — system-wide admin; manages users, faculties, global templates, university-scope forms and rounds.
- `admin` (aka `faculty_admin`) — per-faculty admin; manages own faculty's websites, forms, rounds, and faculty templates.
- `executive` — read-only cross-faculty dashboards and ranking.
- `teacher` / `staff` / `student` — respondents; auto-provisioned on first PSU Passport login.

No public / anonymous respondents (SRS2.0 §1.2 exclusion).

### Scopes

- **Form scope** — `faculty` or `university` (no `public` scope).
- **Template scope** — `faculty` or `global`.
- **Round scope** — `faculty` or `university`.

### Auth Flow

PSU Passport OAuth 2.0 + PKCE → JWT access token (15 min, in-memory) + hashed refresh token (7 d, HttpOnly cookie, atomic rotation, reuse detection triggers revoke-all). Idle timeout 30 min; absolute 8 h. Email OTP required for `super_admin` role overrides. See `docs/design/auth-flow.md`.

## Phase Roadmap (SRS2.0 Appendix E)

- **Phase 1** — auth, Website Registry, Evaluation Rounds, Form Builder, Criteria presets, Evaluator view, Response submission, basic Dashboard, JSON + Excel export, Audit (hash chain), PDPA, Backup / DR.
- **Phase 2** — Ranking (Top 10 / Bottom 5 / Most Improved / Percentile), full Score Card, per-website PDF report, email delivery status, Trend, Faculty heatmap.
- **Phase 3** — Conditional logic, auto-screenshot, AI summary, Public API, multi-language, advanced analytics, benchmarking.

Design docs tag sections with `[P1]` / `[P2]` / `[P3]`.

## Git Branch Strategy

```
main          ← production only, no direct push
└── develop   ← integration branch
    ├── feature/backend-xxx
    ├── feature/frontend-xxx
    └── hotfix/xxx  ← branched from main, merged back to BOTH main and develop
```

Feature branches follow naming: `feature/backend-<area>` or `feature/frontend-<area>`. `develop` deploys to staging; `main` deploys to production (see `docs/design/deployment.md`).
