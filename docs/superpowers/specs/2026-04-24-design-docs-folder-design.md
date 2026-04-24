# Design Spec: `docs/design/` Folder for EILA (SRS2.0-aligned)

**Date:** 2026-04-24 (rewritten after SRS2.0 landed)
**Status:** Approved; implementation underway
**Source of requirements:** [`../../../SRS2.0.md`](../../../SRS2.0.md) (authoritative)
**Superseded:** `SRS_v1.5.md`, `SRSV1.7.md`, `SRS1.8.md`, `SRS1.9.md`, `SRS.md`
**Related:** `../../../CLAUDE.md`, `../../../SRS_REVIEW.md`

## 0. Reset Notice

A prior revision of this spec (2026-04-24 draft) described a
public-access / anonymous-respondent "EILA Survey Platform" pivot.
That pivot is **reverted**. SRS2.0 §1.2 explicitly excludes public
anonymous respondents. This document is rewritten against SRS2.0 and
drops the public-access content entirely.

## 1. Purpose

Create a dedicated folder `docs/design/` that holds system-design
artifacts for the EILA Website Evaluation System. The SRS says *what*
to build; this folder says *how*. The folder contains one README plus
nine design docs covering architecture, database, API, auth, UI
components, deployment, scoring / ranking, data lifecycle, and
security.

## 2. Scope

**In scope**

- Folder layout under `docs/design/`.
- Content outline and conventions for the ten files.
- Design decisions recorded in §7 (Decisions Log).

**Out of scope**

- Writing any application code (TypeScript, SQL migrations, YAML).
- Proposing SRS2.1 beyond the deviations logged in §8.
- Monorepo layout selection — deferred.
- CI pipeline YAML — only a high-level sequence is captured in
  `deployment.md`.
- Test strategy — its own future spec.

## 3. Folder Layout

```
docs/design/
├── README.md                 # index + doc map + deviations log
├── architecture.md           # system context, layers, tech stack, phases
├── db-schema.md              # Drizzle tables + generated SQL + ERD
├── api-contracts.md          # endpoints in markdown tables
├── auth-flow.md              # PSU Passport + JWT refresh rotation + OTP
├── component-tree.md         # Next.js App Router + shared components
├── deployment.md             # envs, infra, pipeline, backup, DR, obs
├── scoring-and-ranking.md    # weighted avg, percentile, trend, heatmap
├── data-lifecycle.md         # soft delete, retention, PDPA, audit chain
└── security.md               # threat model + NFR-SEC mapping
```

Each design doc marks sections with `[P1]` / `[P2]` / `[P3]` to
reflect SRS2.0 Appendix E phases. Unmarked sections apply to every
phase.

## 4. Conventions

| Concern | Convention |
|---|---|
| Diagrams (flows, sequences, ERD) | Mermaid in fenced ` ```mermaid ` blocks |
| Diagrams (simple matrices, boxes) | ASCII |
| API contract per endpoint | Markdown table (method, path, auth, req, res, errors) |
| DB schema | Drizzle TypeScript schema + generated SQL `CREATE TABLE` preview per table |
| Phase tagging | `[P1]` / `[P2]` / `[P3]` on sections or bullets |
| Roles | `super_admin` / `admin` / `executive` / `teacher` / `staff` / `student` |
| Cross-references | Relative links (e.g. `./architecture.md#section`) |
| Link to SRS | Relative link to `../../SRS2.0.md` |

## 5. `README.md` Content

1. Purpose of `docs/design/`.
2. Relationship to `SRS2.0.md` (SRS = what, design = how).
3. Per-file summary table with one-line descriptions and "when to read."
4. Recommended reading order for newcomers.
5. Phase legend (P1 / P2 / P3).
6. **Deviations from SRS2.0** table (see §8).
7. Contribution notes.

## 6. Per-Design-Doc Outlines

Each line summarizes the content the doc must carry. Detailed
outlines live inside the docs themselves; this spec only states the
*required scope* to keep readers honest.

- **architecture.md** — mermaid system-context (six PSU roles, no
  public), layered architecture, tech-stack rationale, cross-cutting
  concerns (logging, i18n `[P3]`, timezone, PDPA), phase boundaries,
  NFR → design-doc map.
- **db-schema.md** — mermaid ERD; Drizzle schemas grouped by domain
  (users / faculties / role_overrides / refresh_tokens; website_targets;
  evaluation_rounds; forms + sections + questions + target_roles +
  versions; evaluation_criteria; templates + template_questions;
  responses + response_answers; notifications + notification_log;
  audit_log); SQL `CREATE TABLE` preview + column notes per table;
  enums; migration strategy (drizzle-kit, `NNNN__*.sql`, expand /
  contract for destructive changes).
- **api-contracts.md** — base path `/api/v1`; JWT auth convention;
  error envelope; endpoints by domain (auth, websites, rounds, forms,
  responses, templates, users / faculties, notifications, reports,
  audit / PDPA, dashboard / ranking, health); per-endpoint table;
  role × endpoint matrix.
- **auth-flow.md** — PSU Passport + PKCE + JWT sequence;
  access / refresh TTLs (15 min / 7 d); refresh rotation + reuse
  detection; FALLBACK_FACULTY_ID; default role student; idle + absolute
  timeouts; logout + revoke-all; email OTP role override for
  `super_admin`; audit events emitted.
- **component-tree.md** — Next.js 14 App Router tree covering
  `(public)/login`, `(auth)/` admin + evaluator + executive areas;
  route × role matrix; shared components (`AppShell`, `FormBuilder`,
  `FormRunner`, `WebsiteOpenButton`, `DataTable`, `ScoreCard` `[P2]`,
  `FacultyHeatmap` `[P2]`, `TrendChart` `[P2]`, `NotificationBell`,
  `AuditLogTable`, etc.); state model (server-first, constrained
  client state, Zod shared schemas); WCAG 2.1 AA notes mapping each
  NFR-ACCESS requirement.
- **deployment.md** — dev / staging / prod envs; env var reference;
  infrastructure topology (edge + app + data tier); GitHub Actions
  pipeline stages; node-cron schedule (URL validation, form
  open / close, round close, reminders, email retry, audit
  archive / purge, refresh-token purge, PDPA anonymize); backup (full
  daily, incremental hourly, 30 d retention, off-site);
  RTO 4 h / RPO 1 h; DR runbook outline; observability (pino, metrics,
  p95 / p99, queue depth, scheduler lag); `/health` + `/readyz`;
  performance targets; release checklist.
- **scoring-and-ranking.md** — criteria snapshot on publish;
  question → criterion mapping + numeric normalization; per-response
  criterion score, per-response form score (weighted average),
  per-website score, response rate, minimum-response threshold; Phase 2
  ranking queries (Top 10 / Bottom 5 / Most Improved, percentile,
  heatmap, trend); caching / materialization plan; edge cases.
- **data-lifecycle.md** — soft-delete column per entity; retention
  matrix; anonymization field rules; PDPA delete workflow + supporting
  table; audit log covered actions; SHA-256 hash chain algorithm;
  verify endpoint; archive + purge cron; FR-DATA / FR-AUDIT coverage
  matrix.
- **security.md** — threat model; TLS 1.2+; authN flow summary (pointer
  to auth-flow); authZ at middleware + query layer; session handling;
  Zod validation + Drizzle parameterized queries; rate limiting;
  secret management; encryption at rest; secure headers; security
  event logging; supply-chain posture; privacy / data minimization;
  NFR-SEC coverage matrix.

## 7. Decisions Log (from brainstorming 2026-04-24)

| # | Question | Decision |
|---|---|---|
| Q1 | Prisma vs. Drizzle | **Drizzle** (override SRS2.0 §5.1 / Appendix A / NFR-MAINT-04 / NFR-SEC-04); flag for SRS2.1 |
| Q2 | Public / anonymous respondents | **Excluded** — align with SRS2.0 §1.2 |
| Q3 | Phase layout | **Flat files + inline `[P1]` / `[P2]` / `[P3]` markers** |
| Q4 | File count | **Nine design docs + README = ten files** (add `scoring-and-ranking.md`, `data-lifecycle.md`, `security.md`) |
| Q5 | Auth model | **JWT access (15 min) + refresh rotation (7 d, hashed, atomic, reuse-detect revoke-all) + email OTP override** |
| Q6 | Role naming | **`super_admin` / `admin`** (from SRS2.0 Appendix C); flag main-text conflict for SRS2.1 |

## 8. Deviations from SRS2.0

Recorded in `docs/design/README.md` and reiterated here so the spec is
self-contained.

| # | SRS2.0 reference | SRS2.0 says | Design says | Rationale |
|---|---|---|---|---|
| 1 | §5.1, Appendix A, NFR-MAINT-04, NFR-SEC-04 | Prisma ORM | Drizzle ORM | Prior product decision; SQL transparency; migrate-per-expand/contract model; SRS2.1 to reconcile. |
| 2 | §2.3 + FR-AUTH / FR-USER main text | `eila_admin` / `faculty_admin` | `super_admin` / `admin` | SRS2.0 Appendix C already uses `super_admin` / `admin`; pick one and align. |

Mapping for readers who hit the prior names in SRS main text:

- `super_admin` ↔ `eila_admin`
- `admin` ↔ `faculty_admin`
- Other roles unchanged.

## 9. Non-Goals

- No restatement of SRS requirements inside design docs; link to
  SRS2.0 sections instead.
- No Prisma code paths.
- No public-access content (reverted per §0).
- No implementation plan, no YAML, no migrations in this folder.
- No project-management artifacts (timeline, owners, sprints).

## 10. Acceptance Criteria

1. `docs/design/` exists at the repo root with ten files per §3.
2. `README.md` lists every other file, includes the phase legend, and
   carries the deviations table from §8.
3. Each design doc contains the outlined content from §6 with `[P1]` /
   `[P2]` / `[P3]` markers where applicable.
4. `db-schema.md` covers every entity in SRS2.0 Appendix A plus
   dependents listed in §6.
5. `api-contracts.md` covers every endpoint in SRS2.0 Appendix B.
6. `auth-flow.md` enumerates FR-AUTH-01..20 behaviors.
7. `data-lifecycle.md` covers FR-DATA-01..10 and FR-AUDIT-01..08.
8. `security.md` provides an NFR-SEC-01..10 coverage table.
9. Role names throughout are `super_admin` / `admin` (per Q6).
10. `CLAUDE.md` is updated to add `docs/design/`, flag superseded SRS
    files, switch role references, and note the Drizzle deviation.
11. No implementation files are touched.
12. No commits are made automatically; the user reviews before commit.

## 11. Follow-Ups

Tracked here for later specs or owner follow-through:

- **SRS2.1 fix list** — Prisma mandate occurrences; role-naming
  conflict between SRS2.0 main text and Appendix C; any further issues
  found while writing design docs.
- **Implementation plan** — invoke the `writing-plans` skill against
  Phase 1 scope once design docs land.
- **Repo layout** — monorepo vs. split; `apps/web` + `apps/api` +
  `packages/shared` vs. flat.
- **CI YAML** — full GitHub Actions pipeline.
- **Test strategy** — unit / integration / e2e split.
- **Multi-version SRS cleanup** — decide which of `SRS.md`,
  `SRSV1.7.md`, `SRS1.8.md`, `SRS1.9.md`, `SRS_v1.5.md`,
  `REQUIREMENTS.md` stay in repo and which get archived or removed.
- **Scheduler deployment** — stick with in-process node-cron on a
  single replica or move to a dedicated worker (decision noted in
  `deployment.md`).
