# EILA Design Docs

System-design artifacts for the **EILA Website Evaluation System**
(ระบบประเมินคุณภาพเว็บไซต์หน่วยงาน, Prince of Songkla University).

Source of requirements: [`../../SRS2.1.md`](../../SRS2.1.md) (authoritative).
SRS says *what* to build; this folder says *how* to build it.

## Doc Map

| File | Summary | When to read |
|---|---|---|
| [`architecture.md`](./architecture.md) | System context, layers, tech stack, phase boundaries | Orientation; before touching any layer |
| [`db-schema.md`](./db-schema.md) | Drizzle schemas + generated SQL + ERD | Designing or querying data |
| [`api-contracts.md`](./api-contracts.md) | Endpoints (method / path / auth / req / res / errors) | Building or consuming API |
| [`auth-flow.md`](./auth-flow.md) | PSU Passport + JWT access / refresh rotation + OTP override | Login, sessions, role override |
| [`component-tree.md`](./component-tree.md) | Next.js App Router + shared components + state | Frontend work |
| [`deployment.md`](./deployment.md) | Envs, infra, pipeline, backup, DR, observability | Ops / release |
| [`scoring-and-ranking.md`](./scoring-and-ranking.md) | Weighted average, percentile, trend, heatmap | Dashboard / ranking features |
| [`data-lifecycle.md`](./data-lifecycle.md) | Soft delete, retention, PDPA, SHA-256 audit chain | Compliance, data work |
| [`security.md`](./security.md) | Threat model, NFR-SEC mapping | Security review |

Recommended reading order for newcomers: `architecture.md` →
`db-schema.md` → `auth-flow.md` → `api-contracts.md` → the rest as
needed.

## Phase Legend

SRS2.1 Appendix E defines three phases. Every design doc tags sections
or subsections with the earliest phase that introduces them:

- **`[P1]`** — Auth, Website Registry, Evaluation Round, Form Builder,
  Criteria Preset, Assignment, Evaluator View, Response Submission,
  basic Dashboard, JSON / Excel Export, Audit, PDPA, Backup.
- **`[P2]`** — Ranking Dashboard, full Website Score Card, per-website
  PDF report, email delivery status, trend comparison, faculty heatmap.
- **`[P3]`** — Conditional Logic, Auto Screenshot, AI Summary,
  Public API, Multi-language, Advanced Analytics, Benchmarking.

Sections without a marker apply to all phases.

## Deviations from SRS2.1

Tracked here so readers know what conflicts exist between these design
docs and SRS2.1.

| # | SRS2.1 reference | SRS2.1 says | Design docs say | Why |
|---|---|---|---|---|
| 1 | - | - | **No active deviations** | Design docs currently aligned to SRS2.1 baseline |

Role mapping note retained for historical cross-reference:

- `super_admin` was `eila_admin` in legacy text
- `admin` was `faculty_admin` in legacy text
- `executive`, `teacher`, `staff`, `student` unchanged

## Contribution Notes

- Each design doc links back to the relevant SRS section instead of
  restating requirements.
- Keep `[P1]` / `[P2]` / `[P3]` markers current when moving features
  across phases.
- When a design decision conflicts with SRS2.1, add a row to the
  deviations table above rather than silently diverging.
- Diagrams: Mermaid for flows / sequences / ERD; ASCII for simple
  boxes and matrices.

## See Also

- [`../../SRS2.1.md`](../../SRS2.1.md) — current authoritative SRS
- [`../../CLAUDE.md`](../../CLAUDE.md) — repo overview for AI agents
- [`../superpowers/specs/2026-04-24-design-docs-folder-design.md`](../superpowers/specs/2026-04-24-design-docs-folder-design.md)
  — spec that produced this folder
