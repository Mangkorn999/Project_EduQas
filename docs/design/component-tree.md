# Component Tree

Frontend design for the Next.js 14 App Router. Covers route map,
shared components, state model, and WCAG 2.1 AA notes.

## 1. Route Map `[P1]`

```
app/
├── (public)/
│   └── login/
│       └── page.tsx              # PSU Passport entry; shows redirect target
├── (auth)/
│   ├── layout.tsx                # app shell; requires session
│   ├── dashboard/                # role-aware landing
│   │   └── page.tsx
│   ├── websites/                 # WebsiteTarget registry
│   │   ├── page.tsx              # list + filters
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── rounds/                   # EvaluationRound
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── forms/
│   │   ├── page.tsx              # admin list
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx         # detail
│   │   ├── [id]/edit/page.tsx    # builder
│   │   ├── [id]/versions/page.tsx
│   │   └── [id]/responses/page.tsx
│   ├── templates/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── evaluator/                # respondent hub
│   │   ├── page.tsx              # my assigned forms (FR-RESP-01)
│   │   └── [formId]/page.tsx     # runner
│   ├── reports/                  # [P1] xlsx, [P2] pdf
│   │   ├── page.tsx
│   │   └── websites/[id]/page.tsx
│   ├── executive/                # [P2] ranking + heatmap
│   │   └── page.tsx
│   ├── admin/
│   │   ├── users/page.tsx
│   │   ├── faculties/page.tsx
│   │   ├── audit-log/page.tsx
│   │   └── pdpa-requests/page.tsx
│   └── settings/page.tsx         # profile, notifications
```

Admin-only routes live under `/admin/*` so the middleware can apply a
single role guard (`super_admin`).

## 2. Route × Role Matrix `[P1]`

| Route | super_admin | admin | executive | teacher/staff/student |
|---|:---:|:---:|:---:|:---:|
| `/dashboard` | ✅ | ✅ (own faculty) | ✅ (cross-faculty) | ✅ (list assigned forms) |
| `/websites/*` | ✅ | ✅ (own faculty) | ❌ | ❌ |
| `/rounds/*` | ✅ | ✅ (own faculty) | ❌ | ❌ |
| `/forms/*` | ✅ | ✅ (own faculty) | ❌ | ❌ |
| `/templates/*` | ✅ | ✅ (own faculty) | ❌ | ❌ |
| `/evaluator/*` | ❌ | ❌ | ❌ | ✅ |
| `/reports/*` | ✅ | ✅ (own faculty) | ✅ (summary) | ❌ |
| `/executive` | ✅ | ❌ | ✅ | ❌ |
| `/admin/*` | ✅ | ❌ | ❌ | ❌ |

## 3. Shared Components `[P1]` unless tagged

| Component | Purpose | Accessibility notes |
|---|---|---|
| `AppShell` | Header, role-aware nav, user menu, notification bell | Skip-to-content link; keyboard trap only in dialogs |
| `SessionWarningDialog` | 5-min countdown before idle expiry (FR-AUTH-18) | `aria-live="assertive"` on countdown |
| `FormBuilder` (dnd-kit) | Drag-drop questions, 10 field types (FR-FORM-05), criteria weights, target roles | Keyboard reorder via up/down buttons (NFR-ACCESS-04) |
| `FormRunner` | Website info banner + "เปิดเว็บไซต์" button + questions (FR-EVAL-01..06) | Soft-gate submit until site opened |
| `WebsiteOpenButton` | Opens target URL in new tab, POSTs `/website-open`, sets badge | Button label + `aria-pressed` reflects opened state |
| `DataTable` | Admin lists (websites, rounds, forms, templates, users) | Column headers as `<th scope>`; sortable with keyboard |
| `FiltersPanel` | Shared filter controls: faculty, round, year, status | Explicit labels; inputs have `aria-describedby` |
| `ScoreCard` `[P2]` | Per-website score summary (FR-DASH-11) | Charts always paired with `<table>` alternative (NFR-ACCESS-07) |
| `FacultyHeatmap` `[P2]` | Faculty × dimension color grid (FR-RANK-04) | Table alternative with numeric cells |
| `TrendChart` `[P2]` | Across-rounds trend (FR-DASH-06) | Table alternative |
| `NotificationBell` | Unread count + list (FR-NOTIF-12) | Popover is keyboard-navigable menu |
| `AuditLogTable` | Admin audit view | Verify button calls `/audit-log/verify` |
| `ConfirmDialog` | Destructive action confirmation | Focus trap; ESC to cancel |
| `ImportWizard` | JSON / XLSX import (FR-USER-03, FR-WEB-07, FR-IE-02) with preview (FR-IE-05) | Clear validation errors via `aria-live` |
| `ExportMenu` | Trigger xlsx / pdf / json exports | Spinner announced via `aria-live="polite"` |

## 4. State Model

- **Server components by default.** Admin lists, read-mostly dashboards,
  and score cards render on the server using `fetch` with `cache: 'no-store'`.
- **Client state** is confined to:
  - `FormBuilder` (local, persisted draft to backend on blur).
  - `FormRunner` (local + autosave patch to backend every 15 s).
  - `SessionContext` (access token in memory, refresh scheduled just
    before expiry).
  - `NotificationBell` (polling or server-sent events; see §6).
- **Auth context**: `SessionProvider` reads `/auth/me` server-side on
  each request. No user data is stored in localStorage or sessionStorage.

## 5. Data Fetching Rules

- Server components call the backend via fetch with a server-side
  service token pattern (JWT signed by backend during SSR handoff) OR
  via a short-lived per-request access token. Decision deferred to the
  implementation spec.
- Client components never call the DB directly. All mutations go through
  the Fastify API.
- Shared Zod schemas live in a `packages/shared` (or equivalent) module
  and are imported by both FE and BE (NFR-MAINT-02).

## 6. Realtime / Polling

- `NotificationBell` polls `/api/v1/notifications/unread-count` every
  30 s as the Phase 1 baseline. Server-sent events or WebSockets are
  out of scope for Phase 1.
- `ScheduledRuns` status page for admins is also poll-based.

## 7. i18n `[P3]`

- Library: `next-intl`.
- Default locale: `th-TH`. Secondary: `en-US` (Phase 3, NFR-ACCESS
  unaffected — Thai UI already AA).
- Message catalogs structured per domain (auth, forms, dashboard) to
  keep translator scope bounded.

## 8. Accessibility (WCAG 2.1 AA)

SRS2.1 NFR-ACCESS-01..08. Applied uniformly:

- Every input has a `<label>`; error text linked via `aria-describedby`
  (NFR-ACCESS-02).
- Full keyboard support on every primary flow (NFR-ACCESS-03).
- DnD has up/down keyboard alternatives (NFR-ACCESS-04).
- Contrast ≥ 4.5:1 normal, ≥ 3:1 large (NFR-ACCESS-05); enforced by
  design tokens.
- Validation errors announced via `aria-live="assertive"` (NFR-ACCESS-06).
- Charts always paired with a `<table>` data alternative (NFR-ACCESS-07).
- Focus states visible on all interactive elements (NFR-ACCESS-08).

## 9. Error & Loading Patterns

- Global error boundary renders a friendly page with retry + report.
- Loading states use skeletons for dashboards; spinners only for
  short operations (< 1 s).
- Network errors surface via a toast with action to retry or reload.
