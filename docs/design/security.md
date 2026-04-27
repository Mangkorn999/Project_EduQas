# Security

Covers SRS2.1 NFR-SEC-01..10 and related FR-AUTH / FR-AUDIT / PDPA
concerns. Companion to `auth-flow.md` (identity), `data-lifecycle.md`
(PDPA + audit), and `deployment.md` (TLS, secrets, envs).

## 1. Threat Model `[P1]`

Primary assets:

- PSU user identities and session tokens.
- Evaluation data (responses, scores, rankings).
- Audit log (integrity is load-bearing for compliance).
- PII in `users.email`, `users.display_name`, and free-text answers.

Primary adversaries:

- Authenticated PSU users attempting cross-faculty access.
- Low-privilege respondents attempting escalation.
- Insider with DB access tampering with audit records.
- Network attackers on PSU intranet snooping or replaying traffic.

Out of scope:

- Public / anonymous respondents (excluded by SRS2.1 §1.2).
- Nation-state-level attackers.

Residual risks:

- Compromised `super_admin` workstation → OTP channel and audit trail
  mitigate but cannot fully prevent.
- Evaluator shoulder-surfing in open labs → session timeouts help.

## 2. Transport `[P1]`

- TLS 1.2+ enforced at the reverse proxy (NFR-SEC-01).
- HTTP requests redirect to HTTPS; the API refuses non-TLS traffic
  when `NODE_ENV=production`.
- HSTS header set at the edge (NFR-SEC-10).

## 3. Authentication `[P1]`

See `auth-flow.md` for the full sequence. Security invariants:

- PSU Passport only; no internal password flow (FR-AUTH-01).
- `state` and `code_verifier` validated on every callback
  (FR-AUTH-02).
- Refresh tokens stored as SHA-256 hash (FR-AUTH-08).
- Rotation is atomic; reuse triggers revoke-all (FR-AUTH-09..10).
- Idle 30 min + absolute 8 h timeouts (FR-AUTH-16..17).
- Role override requires email OTP (FR-AUTH-20).

## 4. Authorization `[P1]`

Defense in depth (NFR-SEC-08):

- **Middleware layer** — Fastify hooks verify JWT, attach
  `{ userId, role, facultyId }` to the request context. Role-based
  gates reject obvious violations.
- **Query layer** — Every domain query explicitly filters by
  `faculty_id` (and `scope`) when the caller is `admin`. Tests prove
  that stripping the middleware does not leak cross-faculty data.

Role × capability enforcement lives in one shared policy module
imported by both the middleware and query services.

## 5. Session Handling `[P1]`

- Access token in memory; never in localStorage / sessionStorage.
- Refresh token: HttpOnly, Secure, SameSite=Strict cookie scoped to
  `/api/v1/auth/*`.
- CSRF token required for state-changing requests that rely on the
  refresh cookie (NFR-SEC-03). Pure `Authorization: Bearer` requests
  skip CSRF because they are not cookie-authenticated.
- Session warning dialog 5 min before idle expiry (FR-AUTH-18).

## 6. Input Validation `[P1]`

- Zod schemas shared between FE and BE (NFR-MAINT-02) — the API
  re-validates every payload regardless of FE shape.
- Prisma-style parameterized queries via Drizzle (NFR-SEC-04). No
  concatenated SQL. `sql` template literals are the only raw-SQL
  escape hatch, and reviewers flag them.
- File upload (XLSX import): content-type check, magic-number check,
  row-count cap, and column header whitelist (FR-USER-04, FR-WEB-07).

## 7. Rate Limiting & Abuse `[P1]`

- Auth-sensitive endpoints rate-limited at ≥ 10 req / min / IP
  (NFR-SEC-05). Examples: `/auth/psu`, `/auth/callback`,
  `/auth/refresh`, OTP request / verify.
- Response submission rate-limited per user to a sane upper bound
  (for example, 60 submits / min / user) to curb runaway clients.
- 429 response body follows the standard error envelope with
  `Retry-After` header.

## 8. Secret Management `[P1]`

- Secrets loaded from the PSU secret store at boot; never baked into
  container images (NFR-SEC-06).
- `.env.example` ships the full set of keys with redacted values.
- CI refuses commits that add entries in `.env*` unless they match the
  example file's keys.
- Rotation cadence: JWT secrets rotated annually or on incident;
  PSU Passport client secret rotated per PSU policy.

## 9. Encryption at Rest `[P1]`

- PostgreSQL volume-level encryption (dm-crypt / equivalent) per
  hosting provider.
- Application-level encryption for `users.email` and any other field
  explicitly marked PII (NFR-SEC-07). Key managed in the secret store;
  rotation procedure documented in the operational runbook.

## 10. Secure Headers `[P1]`

Set at the reverse proxy (NFR-SEC-10):

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | Default-src `self`; connect-src `self` + PSU Passport; no inline scripts except hashed Next.js runtime |
| `X-Frame-Options` | `DENY` on admin routes; `SAMEORIGIN` elsewhere |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disable camera, microphone, geolocation |

## 11. Logging Security Events `[P1]`

NFR-SEC-09. Events emitted (all land in `audit_log` or a parallel
`security_events` table — choice deferred):

- Token reuse detected.
- Repeated failed OTP attempts (threshold configurable).
- Repeated 403 hits from the same user / IP.
- Authorization failures at the query layer (middleware says yes, but
  query guard says no).
- Rate-limit hits (`security.rate_limit_hit`).
- CSP violations reported via `report-uri`.

## 12. Dependency & Supply Chain

- `npm audit` runs on CI; high severity blocks merge.
- Dependabot enabled on both `web/` and `api/`.
- Production images rebuilt weekly even without code changes to pick
  up base-image CVE fixes.

## 13. Privacy & Data Minimization

- Collect only what `users` requires: `psu_passport_id`, `email`,
  `display_name`, `role`, `faculty_id`.
- Free-text answers may contain PII; exposure path controlled via
  scoring-and-ranking rules (aggregate-only in public-facing views,
  which we do not serve in Phase 1, but stay ready for Phase 3 Public
  API).
- PDPA workflow in `data-lifecycle.md` §4.

## 14. NFR-SEC Coverage

| NFR | Where |
|---|---|
| NFR-SEC-01 (HTTPS/TLS) | §2 |
| NFR-SEC-02 (OWASP Top 10) | §1 threat model, §6, §7, §10 |
| NFR-SEC-03 (CSRF) | §5 |
| NFR-SEC-04 (parameterized queries) | §6 |
| NFR-SEC-05 (rate limit) | §7 |
| NFR-SEC-06 (secret management) | §8 |
| NFR-SEC-07 (encryption at rest) | §9 |
| NFR-SEC-08 (authz at middleware + query) | §4 |
| NFR-SEC-09 (security event logging) | §11 |
| NFR-SEC-10 (secure headers) | §10 |
