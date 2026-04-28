# API Contracts

Covers SRS2.1 Appendix B plus endpoints implied by the functional
requirements. All endpoints are served by Fastify under `/api/v1`.

## 1. Conventions

| Concern | Rule |
|---|---|
| Base path | `/api/v1` (exception: `/health`) |
| Auth | `Authorization: Bearer <access_token>` (JWT, 15 min) |
| Token rotation | See `auth-flow.md` |
| Content type | `application/json` unless stated otherwise (XLSX / PDF / JSON export) |
| Timestamps | ISO-8601 UTC, e.g. `2026-04-24T07:15:00Z` |
| Pagination | `?page=<int, default 1>&limit=<int, default 20, max 100>`; response: `{data: [...], page, limit, total}` |
| Filters | Query params documented per endpoint |
| Error envelope | `{error: {code, message, requestId, details?}}` |
| Validation | Zod schemas shared between FE + BE (NFR-MAINT-02) |
| Rate limit | ≥ 10 req / min / IP on auth-sensitive endpoints (NFR-SEC-05) |
| Idempotency | `Idempotency-Key` header honored on `POST` endpoints that create notifications or exports |

### 1.1 Standard Error Codes

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `validation_error` | Body failed Zod schema |
| 401 | `unauthenticated` | Missing or invalid access token |
| 403 | `forbidden` | Authenticated but not permitted |
| 404 | `not_found` | Resource missing or soft-deleted |
| 409 | `conflict` | Optimistic-lock mismatch or unique violation |
| 410 | `deprecated` | Template deprecated |
| 422 | `business_rule` | Valid request but domain rule rejected it |
| 429 | `rate_limited` | Too many requests |
| 500 | `internal_error` | Unhandled server fault |

### 1.2 Error Payload Details (NFR-API)

- `requestId` is required on every non-2xx response for traceability.
- `400 validation_error` returns `details[]` with `{ field, reason }`.
- `401/403` always return machine-readable `code`.
- `500 internal_error` must not expose stack traces, SQL, or secrets.

## 2. Auth `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/auth/psu` | none | Redirects to PSU Passport with PKCE `code_challenge` |
| `GET` | `/api/v1/auth/callback` | none | Exchanges code, issues access token and refresh cookie |
| `POST` | `/api/v1/auth/refresh` | refresh cookie | Rotates tokens, reuse detection |
| `POST` | `/api/v1/auth/logout` | Bearer | Revokes current refresh token |
| `POST` | `/api/v1/auth/revoke-all` | Bearer | Revokes all refresh tokens for the user |
| `GET` | `/api/v1/auth/me` | Bearer | Returns effective role, faculty, display name |
| `POST` | `/api/v1/auth/role-override/otp/request` | Bearer (`super_admin`) | Sends OTP email |
| `POST` | `/api/v1/auth/role-override/otp/verify` | Bearer (`super_admin`) | Verifies OTP, applies override, audits |

### 2.1 `POST /api/v1/auth/refresh`

| Field | Value |
|---|---|
| Request | `refreshToken` is read from HttpOnly cookie |
| Response 200 | `{ accessToken: string }` |
| Errors | `401 token_reuse` (triggers revoke-all, FR-AUTH-10), `401 unauthenticated` |

## 3. Website Registry `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/websites` | Bearer | Filters: `?facultyId&category&urlStatus&q` |
| `POST` | `/api/v1/websites` | `super_admin` or `admin` (own faculty) | Create WebsiteTarget |
| `GET` | `/api/v1/websites/:id` | Bearer | Read single |
| `PATCH` | `/api/v1/websites/:id` | `super_admin` or `admin` (own faculty) | Partial update |
| `DELETE` | `/api/v1/websites/:id` | `super_admin` or `admin` (own faculty) | Soft delete |
| `POST` | `/api/v1/websites/import` | `super_admin` | XLSX import (FR-WEB-07) |

### 3.1 `POST /api/v1/websites`

| Field | Value |
|---|---|
| Request | `{ name, url, category?, ownerFacultyId }` |
| Response 201 | WebsiteTarget |
| Errors | `400`, `403` (cross-faculty for `admin`), `409` URL duplicate |

## 4. Evaluation Rounds `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/rounds` | Bearer | Filters: `?scope&facultyId&academicYear&status` |
| `POST` | `/api/v1/rounds` | `super_admin` (any) or `admin` (faculty own only) | Create |
| `GET` | `/api/v1/rounds/:id` | Bearer | Read |
| `PATCH` | `/api/v1/rounds/:id` | creator or `super_admin` | Update |
| `POST` | `/api/v1/rounds/:id/close` | creator or `super_admin` | Auto-closes member forms (FR-ROUND-07) |

## 5. Forms `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/forms` | Bearer | Filters: `?scope&facultyId&status&roundId&websiteId&q`. Respondents see only assigned forms (FR-RESP-01). |
| `POST` | `/api/v1/forms` | `super_admin` (any scope) or `admin` (faculty scope) | Create |
| `GET` | `/api/v1/forms/:id` | Bearer | Includes questions and criteria snapshot |
| `PATCH` | `/api/v1/forms/:id` | owner admin | Requires `If-Match: <version>` for optimistic locking (FR-FORM-17) |
| `DELETE` | `/api/v1/forms/:id` | owner admin | Soft delete |
| `POST` | `/api/v1/forms/:id/publish` | owner admin | Transitions draft → open; validates URL and required fields |
| `POST` | `/api/v1/forms/:id/close` | owner admin | open → closed |
| `POST` | `/api/v1/forms/:id/duplicate` | owner admin | Clone form as a new draft |
| `GET` | `/api/v1/forms/:id/versions` | owner admin | List snapshots |
| `POST` | `/api/v1/forms/:id/versions/:vid/rollback` | owner admin | Create a new draft from snapshot (FR-FORM-20) |
| `GET` | `/api/v1/forms/:id/export.json` | owner admin | JSON export without responses (FR-IE-04) |
| `POST` | `/api/v1/forms/import.json` | admin | Import JSON with Zod validation, preview flow (FR-IE-02, FR-IE-05) |

## 6. Responses `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/forms/:formId/responses` | owner admin, `super_admin`, `executive` | List; optional `?userId` (admin only) |
| `POST` | `/api/v1/forms/:formId/responses` | respondent (in scope) | Create or upsert. Soft gate: requires `websiteOpenedAt` prior to submit (FR-EVAL-06) |
| `GET` | `/api/v1/responses/:id` | owner of response or owner admin | Read |
| `PATCH` | `/api/v1/responses/:id` | owner of response | Allowed only while form is `open` (FR-RESP-03) |
| `POST` | `/api/v1/responses/:id/submit` | owner of response | Final submit after website has been opened |
| `POST` | `/api/v1/forms/:formId/website-open` | respondent | Logs `websiteOpenedAt` (FR-EVAL-03) |

Request body (submit):

```json
{
  "formOpenedAt": "2026-04-24T07:00:00Z",
  "websiteOpenedAt": "2026-04-24T07:05:00Z",
  "answers": [
    { "questionId": "uuid", "valueNumber": 4 },
    { "questionId": "uuid", "valueText": "แนะนำเพิ่มเมนู..." }
  ]
}
```

## 7. Templates `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/templates` | Bearer | Filters: `?scope&facultyId&includeDeprecated=false` |
| `POST` | `/api/v1/templates` | `super_admin` (any scope) or `admin` (faculty scope) | Create |
| `GET` | `/api/v1/templates/:id` | Bearer | Read |
| `PATCH` | `/api/v1/templates/:id` | owner or `super_admin` | Update; does not affect existing forms (FR-TMPL-10) |
| `DELETE` | `/api/v1/templates/:id` | owner or `super_admin` | Soft delete |
| `POST` | `/api/v1/templates/:id/deprecate` | owner or `super_admin` | Mark deprecated (FR-TMPL-05) |
| `POST` | `/api/v1/templates/:id/clone` | owner or `super_admin` | Clone (cross-faculty only for `super_admin`) |
| `POST` | `/api/v1/forms/from-template/:templateId` | admin | Create new form by snapshotting template |

## 8. Users & Faculties `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/users` | `super_admin` | Filters: role, faculty, status |
| `POST` | `/api/v1/users` | `super_admin` | Create `admin` / `executive` |
| `PATCH` | `/api/v1/users/:id` | `super_admin` | Role override triggers `/auth/revoke-all` for user (FR-AUTH-15) |
| `DELETE` | `/api/v1/users/:id` | `super_admin` | Soft delete + revoke tokens (FR-USER-07) |
| `POST` | `/api/v1/users/import` | `super_admin` | XLSX import (FR-USER-03) |
| `GET` | `/api/v1/faculties` | Bearer | List active faculties |
| `POST` | `/api/v1/faculties` | `super_admin` | Create |
| `PATCH` | `/api/v1/faculties/:id` | `super_admin` | Update |

## 9. Notifications `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Bearer | Own notifications |
| `GET` | `/api/v1/notifications/unread-count` | Bearer | |
| `PUT` | `/api/v1/notifications/:id/read` | Bearer | Mark one as read |
| `PUT` | `/api/v1/notifications/read-all` | Bearer | Mark all as read |
| `GET` | `/api/v1/notifications/delivery-status` `[P2]` | `super_admin` | Admin panel view (FR-NOTIF-10) |
| `POST` | `/api/v1/notifications/:id/resend` `[P2]` | `super_admin` | Manual resend (FR-NOTIF-11, FR-NOTIF-13) |

## 10. Reports `[P1]` for Excel / JSON, `[P2]` for PDF

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/reports/forms/:id/responses.xlsx` | admin, `super_admin` | Per-form response export (FR-IE-07) |
| `GET` | `/api/v1/reports/websites/:id/pdf` `[P2]` | admin or `super_admin` | Per-website quality report |
| `POST` | `/api/v1/reports/websites/:id/email` `[P2]` | `super_admin` | Send PDF to owner faculty (FR-IE-13) |
| `GET` | `/api/v1/reports/ranking.xlsx` `[P2]` | `super_admin`, `executive` | Ranking export (FR-IE-14) |
| `GET` | `/api/v1/reports/summary.pdf` `[P2]` | `executive` | University overview (FR-IE-09) |

Long-running exports enqueue a job and return 202 with a job id; poll
`GET /api/v1/jobs/:id` for status (keeps P95 ≤ 10 s per NFR-PERF-06).

## 11. Audit & PDPA `[P1]`

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/audit-log` | `super_admin` | Filters: actor, entity, time window |
| `GET` | `/api/v1/audit-log/verify` | `super_admin` | Runs hash-chain verification (FR-AUDIT-07) |
| `POST` | `/api/v1/pdpa/requests` | Bearer | User submits delete / anonymize request |
| `GET` | `/api/v1/pdpa/requests` | `super_admin` | List for review |
| `POST` | `/api/v1/pdpa/requests/:id/approve` | `super_admin` | Approves (triggers anonymize workflow, FR-DATA-08) |
| `POST` | `/api/v1/pdpa/requests/:id/reject` | `super_admin` | Reject with reason |

## 12. Dashboard & Ranking `[P1]` for dashboard, `[P2]` for ranking

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/overview` | per role | Filters: round, faculty, category, academicYear |
| `GET` | `/api/v1/dashboard/websites/:id` | per role | Score card (FR-DASH-11) |
| `GET` | `/api/v1/dashboard/trend` `[P2]` | per role | Trend across rounds (FR-DASH-06) |
| `GET` | `/api/v1/ranking/top` `[P2]` | `super_admin`, `executive` | Top 10 (FR-RANK-01) |
| `GET` | `/api/v1/ranking/bottom` `[P2]` | `super_admin`, `executive` | Bottom 5 |
| `GET` | `/api/v1/ranking/most-improved` `[P2]` | `super_admin`, `executive` | FR-RANK-03 |
| `GET` | `/api/v1/ranking/heatmap` `[P2]` | `super_admin`, `executive` | Faculty × dimension (FR-RANK-04) |

Formulae and threshold rules live in `scoring-and-ranking.md`.

### 12.1 Ranking response contract additions (FR-RANK-10)

Ranking endpoints should include eligibility status so FE can explain exclusions:

```json
{
  "websiteId": "uuid",
  "score": 82.41,
  "responseRate": 0.27,
  "rankingEligibility": "excluded_low_response"
}
```

## 13. Health

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/health` | none | `{ status, db, smtp, scheduler }` per NFR-AVAIL-08 |
| `GET` | `/readyz` | none | Ready for traffic (all deps green) |

## 14. Role × Endpoint Matrix

| Capability | super_admin | admin | executive | teacher/staff/student |
|---|:---:|:---:|:---:|:---:|
| Manage websites (any faculty) | ✅ | ❌ | ❌ | ❌ |
| Manage websites (own faculty) | ✅ | ✅ | ❌ | ❌ |
| Create university round | ✅ | ❌ | ❌ | ❌ |
| Create faculty round | ✅ | ✅ (own) | ❌ | ❌ |
| Create university form | ✅ | ❌ | ❌ | ❌ |
| Create faculty form | ✅ | ✅ (own) | ❌ | ❌ |
| Manage all templates | ✅ | ❌ | ❌ | ❌ |
| Manage own faculty templates | ✅ | ✅ | ❌ | ❌ |
| Submit response | ❌ | ❌ | ❌ | ✅ |
| View cross-faculty dashboard / ranking | ✅ | ❌ | ✅ | ❌ |
| Export per-website PDF | ✅ | ✅ | summary only | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ |
