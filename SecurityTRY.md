Security Review — EILA Backend                                                                                                                                                   
                                                                                                                                                                                   
  Branch: develop | Scope: Backend only | Date: 2026-04-29                                                                                                                         
                                                                                                                                                                                   
  ---
  Vuln 1: Authentication Bypass — backend/api/src/modules/auth/oauth.handler.ts:34

  - Severity: Critical
  - Category: authentication_bypass
  - Confidence: 9/10
  - Description: The /auth/callback endpoint performs no real OAuth exchange. It uses a hardcoded mock profile (psu_passport_id: '12345', role student) and issues a fully signed
  JWT to any caller sending GET /auth/callback?code=<anything>. No state validation, no PKCE verifier, no upstream HTTP call to PSU Passport. The code is notguarded by any
  environment flag, so it is live in production as-is.
  - Exploit Scenario: curl "https://api.eila.psu.ac.th/auth/callback?code=x" → server returns a valid 15-minute access token and a 7-day refresh token for the hardcoded identity
  with no credentials required. Any attacker can authenticate as this user without a PSU Passport account.
  - Recommendation: Replace the mock block with a real OAuth token exchange: POST code + PKCE code_verifier to the PSU Passport token endpoint, validate the state parameter
  against a server-side nonce stored in the session, then parse the returned id_token. See docs/design/auth-flow.md for the specified flow.

  ---
  Vuln 2: Sensitive Data Exposure — backend/api/src/modules/auth/otp.service.ts:11

  - Severity: High
  - Category: sensitive_data_exposure
  - Confidence: 10/10
  - Description: The raw 6-digit OTP is printed in plaintext to stdout before email delivery: console.log(\[MAIL] Sending OTP ${otp} to ${email}`)`. The OTP is otherwise stored
  only as a SHA-256 hash in memory. In any containerized deployment (Docker + log forwarder, CI/CD log capture, logging SaaS), the raw secret is readable by anyone with log-read
  access.
  - Exploit Scenario: Attacker with read access to application logs (ops dashboard, Datadog, Splunk, CI pipeline) extracts the OTP → calls POST /auth/role-override/otp/verify
  within 10 minutes → a roleOverrides record is inserted granting super_admin to the target user. The entire OTP-gated super_admin elevation flow is bypassedvia logs alone.
  - Recommendation: Remove the OTP value from the log line. Safe alternative: console.log(\[MAIL] Sending OTP to ${email}`). If raw OTP logging is needed locally, gate it behind
  an explicit DEBUG` environment flag that is disabled by default.

  ---
  Vuln 3: Privilege Escalation — backend/api/src/modules/rounds/rounds.handler.ts:97 + rounds.service.ts:47

  - Severity: Medium
  - Category: authorization_bypass
  - Confidence: 8/10
  - Description: The PATCH /:id (update round) handler passes request.body as any to service.updateRound(), which calls tx.update(rounds).set(data) without an allow-list. Zod
  strips unknown fields before the handler runs, so scope/facultyId/deletedAt injection is blocked. However, status is in the Zod schema (z.enum(['draft','active','closed'])) and
  flows directly into set(data) with no role-based transition guard. An admin (faculty-scoped) can call this endpoint and freely set status to any value, including reopening
  closed rounds or closing active ones — bypassing the dedicated /open and /close endpoints that enforce business rules and audit logging.
  - Exploit Scenario: PATCH /api/v1/rounds/:id with body { "status": "draft" } from an authenticated admin → round is silently reverted to draft state, bypassing the audit-logged
  /close flow and any round-closure side-effects (auto-close forms, notifications).
  - Recommendation: Remove status from the PATCH schema. Handle status transitions exclusively through the dedicated /open and /close endpoints, which can enforce role
  restrictions, audit logging, and business-rule validation. Alternatively, add an explicit guard: reject status in the PATCH body if request.user.role !== 'super_admin'.

  ---
  Vuln 4: Privilege Escalation — backend/api/src/modules/users/users.service.ts:121

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating or updating users with role: 'super_admin' directly from a spreadsheet cell, with no OTP challenge. This bypasses FR-AUTH-20
  (OTP required for super_admin elevation) and FR-USER-01 (user management domain is limited to admin and executive). The single-user creation endpoint (POST/users) explicitly
  excludes super_admin from its role enum — the import route applies no equivalent restriction. Session revocation (sessionService.revokeAll) is also skippedfor bulk-updated
  users, violating FR-AUTH-15.
  - Exploit Scenario: A compromised or insider-threat super_admin uploads an XLSX with a row specifying role=super_admin for a target account → account is immediately promoted to
  super_admin with no OTP, no second-factor, and no role.override audit event. The attacker has silently persisted super_admin access on a secondary account.
  - Recommendation: Add super_admin to the blocklist in importUsersXlsx, mirroring the existing restriction in the single-create endpoint schema. If super_admin provisioning via
  import is ever intentional, wire it through the same OTP flow used by /auth/role-override/otp/* and call sessionService.revokeAll for affected users.

  capture, logging SaaS), the raw secret is readable by anyone with log-read
   access.
  - Exploit Scenario: Attacker with read access to application logs (ops
  dashboard, Datadog, Splunk, CI pipeline) extracts the OTP → calls POST
  /auth/role-override/otp/verify within 10 minutes → a roleOverrides record
  is inserted granting super_admin to the target user. The entire OTP-gated
  super_admin elevation flow is bypassed via logs alone.
  - Recommendation: Remove the OTP value from the log line. Safe
  alternative: console.log(\[MAIL] Sending OTP to ${email}`). If raw OTP
  logging is needed locally, gate it behind an explicit DEBUG` environment
  flag that is disabled by default.

  ---
  Vuln 3: Privilege Escalation —
  backend/api/src/modules/rounds/rounds.handler.ts:97 + rounds.service.ts:47

  - Severity: Medium
  - Category: authorization_bypass
  - Confidence: 8/10
  - Description: The PATCH /:id (update round) handler passes request.body
  as any to service.updateRound(), which calls tx.update(rounds).set(data)
  without an allow-list. Zod strips unknown fields before the handler runs,
  so scope/facultyId/deletedAt injection is blocked. However, status is in
  the Zod schema (z.enum(['draft','active','closed'])) and flows directly
  into set(data) with no role-based transition guard. An admin
  (faculty-scoped) can call this endpoint and freely set status to any
  value, including reopening closed rounds or closing active ones —
  bypassing the dedicated /open and /close endpoints that enforce business
  rules and audit logging.
  - Exploit Scenario: PATCH /api/v1/rounds/:id with body { "status": "draft"
   } from an authenticated admin → round is silently reverted to draft
  state, bypassing the audit-logged /close flow and any round-closure
  side-effects (auto-close forms, notifications).
  - Recommendation: Remove status from the PATCH schema. Handle status
  transitions exclusively through the dedicated /open and /close endpoints,
  which can enforce role restrictions, audit logging, and business-rule
  validation. Alternatively, add an explicit guard: reject status in the
  PATCH body if request.user.role !== 'super_admin'.

  ---
  Vuln 4: Privilege Escalation —
  backend/api/src/modules/users/users.service.ts:121

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating or updating users with
   role: 'super_admin' directly from a spreadsheet cell, with no OTP
  challenge. This bypasses FR-AUTH-20 (OTP required for super_admin
  elevation) and FR-USER-01 (user management domain is limited to admin and
  executive). The single-user creation endpoint (POST /users) explicitly
  excludes super_admin from its role enum — the import route applies no
  ---
  Vuln 4: Privilege Escalation — backend/api/src/modules/users/users.service.ts:121

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating or updating users with role: 'super_admin' directly from a spreadsheet cell, with no OTP challenge. This bypasses FR-AUTH-20
  (OTP required for super_admin elevation) and FR-USER-01 (user management domain is limited to admin and executive). The single-user creation endpoint (POST/users) explicitly
  audit logging.
  - Exploit Scenario: PATCH /api/v1/rounds/:id with body { "status": "draft" } from an authenticated admin → round is silently reverted
  to draft state, bypassing the audit-logged /close flow and any round-closure side-effects (auto-close forms, notifications).
  - Recommendation: Remove status from the PATCH schema. Handle status transitions exclusively through the dedicated /open and /close
  endpoints, which can enforce role restrictions, audit logging, and business-rule validation. Alternatively, add an explicit guard:
  reject status in the PATCH body if request.user.role !== 'super_admin'.

  ---
  Vuln 4: Privilege Escalation — backend/api/src/modules/users/users.service.ts:121

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating or updating users with role: 'super_admin' directly from a spreadsheet cell, with
  no OTP challenge. This bypasses FR-AUTH-20 (OTP required for super_admin elevation) and FR-USER-01 (user management domain is limited
  to admin and executive). The single-user creation endpoint (POST /users) explicitly excludes super_admin from its role enum — the
  import route applies no equivalent restriction. Session revocation (sessionService.revokeAll) is also skipped for bulk-updated users,
  violating FR-AUTH-15.
  - Exploit Scenario: A compromised or insider-threat super_admin uploads an XLSX with a r
  role-based transition guard. An admin (faculty-scoped) can call this endpoint and freely
   set status to any value, including reopening closed rounds or closing active ones —
  bypassing the dedicated /open and /close endpoints that enforce business rules and audit
   logging.
  - Exploit Scenario: PATCH /api/v1/rounds/:id with body { "status": "draft" } from an
  authenticated admin → round is silently reverted to draft state, bypassing the
  audit-logged /close flow and any round-closure side-effects (auto-close forms,
  notifications).
  - Recommendation: Remove status from the PATCH schema. Handle status transitions
  exclusively through the dedicated /open and /close endpoints, which can enforce role
  restrictions, audit logging, and business-rule validation. Alternatively, add an
  explicit guard: reject status in the PATCH body if request.user.role !== 'super_admin'.

  ---
  Vuln 4: Privilege Escalation — backend/api/src/modules/users/users.service.ts:121

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating or updating users with role:
  'super_admin' directly from a spreadsheet cell, with no OTP challenge. This bypasses
  FR-AUTH-20 (OTP required for super_admin elevation) and FR-USER-01 (user management
  domain is limited to admin and executive). The single-user creation endpoint (POST
  /users) explicitly excludes super_admin from its role enum — the import route applies no
   equivalent restriction. Session revocation (sessionService.revokeAll) is also skipped
  for bulk-updated users, violating FR-AUTH-15.
  - Exploit Scenario: A compromised or insider-threat super_admin uploads an XLSX with a
  row specifying role=super_admin for a target account → account is immediately promoted
  to super_admin with no OTP, no second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on a secondary account.
  - Recommendation: Add super_admin to the blocklist in importUsersXlsx, mirroring the
  existing restriction in the single-create endpoint schema. If super_admin provisioning
  via import is ever intentional, wire it through the same OTP flow used by
  /auth/role-override/otp/* and c
  See docs/design/auth-flow.md
  for the specified flow.

  ---
  Vuln 2: Sensitive Data Exposure
   — backend/api/src/modules/auth
  /otp.service.ts:11

  - Severity: High
  - Category:
  sensitive_data_exposure
  - Confidence: 10/10
  - Description: The raw 6-digit
  OTP is printed in plaintext to
  stdout before email delivery:
  console.log(\[MAIL] Sending OTP
   ${otp} to ${email}`)`. The OTP
   is otherwise stored only as a
  SHA-256 hash in memory. In any
  containerized deployment
  (Docker + log forwarder, CI/CD
  log capture, logging SaaS), the
   raw secret is readable by
  anyone with log-read access.
  - Exploit Scenario: Attacker
  with read access to application
   logs (ops dashboard, Datadog,
  Splunk, CI pipeline) extracts
  the OTP → calls POST
  /auth/role-override/otp/verify
  within 10 minutes → a
  roleOverrides record is
  inserted granting super_admin
  to the target user. The entire
  OTP-gated super_admin elevation
   flow is bypassed via logs
  alone.
  - Recommendation: Remove the
  OTP value from the log line.
  Safe alternative:
  console.log(\[MAIL] Sending OTP
   to ${email}`). If raw OTP
  logging is needed locally, gate
   it behind an explicit DEBUG`
  environment flag that is
  disabled by default.

  ---
  Vuln 3: Privilege Escalation —
  backend/api/src/modules/rounds/
  rounds.handler.ts:97 +
  rounds.service.ts:47

  - Severity: Medium
  - Category:
  authorization_bypass
  - Confidence: 8/10
  - Description: The PATCH /:id
  (update round) handler passes
  request.body as any to
  service.updateRound(), which
  calls
  tx.update(rounds).set(data)
  without an allow-list. Zod
  strips unknown fields before
  the handler runs, so
  scope/facultyId/deletedAt
  injection is blocked. However,
  status is in the Zod schema
  (z.enum(['draft','active','clos
  ed'])) and flows directly into
  set(data) with no role-based
  transition guard. An admin
  (faculty-scoped) can call this
  endpoint and freely set status
  to any value, including
  reopening closed rounds or
  closing active ones — bypassing
   the dedicated /open and /close
   endpoints that enforce
  business rules and audit
  logging.
  - Exploit Scenario: PATCH
  /api/v1/rounds/:id with body {
  "status": "draft" } from an
  authenticated admin → round is
  silently reverted to draft
  state, bypassing the
  audit-logged /close flow and
  any round-closure side-effects
  (auto-close forms,
  notifications).
  - Recommendation: Remove status
   from the PATCH schema. Handle
  status transitions exclusively
  through the dedicated /open and
   /close endpoints, which can
  enforce role restrictions,
  audit logging, and
  business-rule validation.
  Alternatively, add an explicit
  guard: reject status in the
  PATCH body if request.user.role
   !== 'super_admin'.

  ---
  Vuln 4: Privilege Escalation —
  backend/api/src/modules/users/u
  sers.service.ts:121

  - Severity: High
  - Category:
  privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk
  import allows creating or
  updating users with role:
  'super_admin' directly from a
  spreadsheet cell, with no OTP
  challenge. This bypasses
  FR-AUTH-20 (OTP required for
  super_admin elevation) and
  FR-USER-01 (user management
  domain is limited to admin and
  executive). The single-user
  creation endpoint (POST /users)
   explicitly excludes
  super_admin from its role enum
  — the import route applies no
  equivalent restriction. Session
   revocation
  (sessionService.revokeAll) is
  also skipped for bulk-updated
  users, violating FR-AUTH-15.
  - Exploit Scenario: A
  compromised or insider-threat
  super_admin uploads an XLSX
  with a row specifying
  role=super_admin for a target
  account → account is
  immediately promoted to
  super_admin with no OTP, no
  second-factor, and no
  role.override audit event. The
  attacker has silently persisted
   super_admin access on a
  secondary account.
  - Recommendation: Add
  super_admin to the blocklist in
   importUsersXlsx, mirroring the
   existing restriction in the
  single-create endpoint schema.
  If super_admin provisioning via
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating or updating users with role: 'super_admin' directly from a
  spreadsheet cell, with no OTP challenge. This bypasses FR-AUTH-20 (OTP required for super_admin elevation) and
  FR-USER-01 (user management domain is limited to admin and executive). The single-user creation endpoint (POST
  /users) explicitly excludes super_admin from its role enum — the import route applies no equivalent restriction.
  Session revocation (sessionService.revokeAll) is also skipped for bulk-updated users, violating FR-AUTH-15.
  - Exploit Scenario: A compromised or insider-threat super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The attacker has silently persisted super_admin access on a
  secondary account.
  - Recommendation: Add super_admin to the blocklist in importUsersXlsx, mirroring the existing restriction in the
  single-create endpoint schema. If super_admin pr
  deployment (Docker + log forwarder, CI/CD log
  capture, logging SaaS), the raw secret is
  readable by anyone with log-read access.
  - Exploit Scenario: Attacker with read access to
   application logs (ops dashboard, Datadog,
  Splunk, CI pipeline) extracts the OTP → calls
  POST /auth/role-override/otp/verify within 10
  minutes → a roleOverrides record is inserted
  granting super_admin to the target user. The
  entire OTP-gated super_admin elevation flow is
  bypassed via logs alone.
  - Recommendation: Remove the OTP value from the
  log line. Safe alternative: console.log(\[MAIL]
  Sending OTP to ${email}`). If raw OTP logging is
   needed locally, gate it behind an explicit
  DEBUG` environment flag that is disabled by
  default.

  ---
  Vuln 3: Privilege Escalation — backend/api/src/m
  odules/rounds/rounds.handler.ts:97 +
  rounds.service.ts:47

  - Severity: Medium
  - Category: authorization_bypass
  - Confidence: 8/10
  - Description: The PATCH /:id (update round)
  handler passes request.body as any to
  service.updateRound(), which calls
  tx.update(rounds).set(data) without an
  allow-list. Zod strips unknown fields before the
   handler runs, so scope/facultyId/deletedAt
  injection is blocked. However, status is in the
  Zod schema (z.enum(['draft','active','closed']))
   and flows directly into set(data) with no
  role-based transition guard. An admin
  (faculty-scoped) can call this endpoint and
  freely set status to any value, including
  reopening closed rounds or closing active ones —
   bypassing the dedicated /open and /close
  endpoints that enforce business rules and audit
  logging.
  - Exploit Scenario: PATCH /api/v1/rounds/:id
  with body { "status": "draft" } from an
  authenticated admin → round is silently reverted
   to draft state, bypassing the audit-logged
  /close flow and any round-closure side-effects
  (auto-close forms, notifications).
  - Recommendation: Remove status from the PATCH
  schema. Handle status transitions exclusively
  through the dedicated /open and /close
  endpoints, which can enforce role restrictions,
  audit logging, and business-rule validation.
  Alternatively, add an explicit guard: reject
  status in the PATCH body if request.user.role
  !== 'super_admin'.

  ---
  Vuln 4: Privilege Escalation — backend/api/src/m
  odules/users/users.service.ts:121

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows
  creating or updating users with role:
  'super_admin' directly from a spreadsheet cell,
  with no OTP challenge. This bypasses FR-AUTH-20
  (OTP required for super_admin elevation) and
  FR-USER-01 (user management domain is limited to
   admin and executive). The single-user creation
  endpoint (POST /users) explicitly excludes
  super_admin from its role enum — the import
  route applies no equivalent restriction. Session
   revocation (sessionService.revokeAll) is also
  skipped for bulk-updated users, violating
  FR-AUTH-15.
  - Exploit Scenario: A compromised or
  insider-threat super_admin uploads an XLSX with
  a row specifying role=super_admin for a target
  account → account is immediately promoted to
  super_admin with no OTP, no second-factor, and
  no role.override audit event. The attacker has

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating or updating users with role: 'super_admin' directly from a spreadsheet cell, with no OTP challenge. This
   bypasses FR-AUTH-20 (OTP required for super_admin elevation) and FR-USER-01 (user management domain is limited to admin and executive). The single-user
  creation endpoint (POST /users) explicitly excludes super_admin from its role enum — the import route applies no equivalent restriction. Session revocation
  (sessionService.revokeAll) is also skipped for bulk-updated users, violating FR-AUTH-15.
  - Exploit Scenario: A compromised or insider-threat super_admin uploads an XLSX with a row specifying role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no second-factor, and no role.override audit event. The attacker has silently persisted super_admin access
  on a secondary account.
  - Recommendation: Add super_admin to the blocklist in importUsersXlsx, mirroring the existing restriction in the single-create endpoint schema. If
  super_admin provisioning via import is ever intentional, wire it through the same OTP flow used by /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

✻ Churned for 6m 38s

※ recap: Security review of the backend is complete. Four confirmed vulnerabilities were reported: a critical OAuth mock bypass, OTP plaintext logging, round
  application logs (ops dashboard, Datadog, Splunk, CI
  pipeline) extracts the OTP → calls POST
  /auth/role-override/otp/verify within 10 minutes → a
  roleOverrides record is inserted granting super_admin
   to the target user. The entire OTP-gated super_admin
   elevation flow is bypassed via logs alone.
  - Recommendation: Remove the OTP value from the log
  line. Safe alternative: console.log(\[MAIL] Sending
  OTP to ${email}`). If raw OTP logging is needed
  locally, gate it behind an explicit DEBUG`
  environment flag that is disabled by default.

  ---
  Vuln 3: Privilege Escalation —
  backend/api/src/modules/rounds/rounds.handler.ts:97 +
   rounds.service.ts:47

  - Severity: Medium
  - Category: authorization_bypass
  - Confidence: 8/10
  - Description: The PATCH /:id (update round) handler
  passes request.body as any to service.updateRound(),
  which calls tx.update(rounds).set(data) without an
  allow-list. Zod strips unknown fields before the
  handler runs, so scope/facultyId/deletedAt injection
  is blocked. However, status is in the Zod schema
  (z.enum(['draft','active','closed'])) and flows
  directly into set(data) with no role-based transition
   guard. An admin (faculty-scoped) can call this
  endpoint and freely set status to any value,
  including reopening closed rounds or closing active
  ones — bypassing the dedicated /open and /close
  endpoints that enforce business rules and audit
  logging.
  - Exploit Scenario: PATCH /api/v1/rounds/:id with
  body { "status": "draft" } from an authenticated
  admin → round is silently reverted to draft state,
  bypassing the audit-logged /close flow and any
  round-closure side-effects (auto-close forms,
  notifications).
  - Recommendation: Remove status from the PATCH
  schema. Handle status transitions exclusively through
   the dedicated /open and /close endpoints, which can
  enforce role restrictions, audit logging, and
  business-rule validation. Alternatively, add an
  explicit guard: reject status in the PATCH body if
  request.user.role !== 'super_admin'.

  ---
  Vuln 4: Privilege Escalation —
  backend/api/src/modules/users/users.service.ts:121

  - Severity: High
  - Category: privilege_escalation
  - Confidence: 9/10
  - Description: The XLSX bulk import allows creating
  or updating users with role: 'super_admin' directly
  from a spreadsheet cell, with no OTP challenge. This
  bypasses FR-AUTH-20 (OTP required for super_admin
  elevation) and FR-USER-01 (user management domain is
  limited to admin and executive). The single-user
  creation endpoint (POST /users) explicitly excludes
  super_admin from its role enum — the import route
  applies no equivalent restriction. Session revocation
   (sessionService.revokeAll) is also skipped for
  bulk-updated users, violating FR-AUTH-15.
  - Exploit Scenario: A compromised or insider-threat
  super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on
   a secondary account.
  - Recommendation: Add super_admin to the blocklist in
   importUsersXlsx, mirroring the existing restriction
  in the single-create endpoint schema. If super_admin
  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

✻ Churned for 6m 38s

※ recap: Security review of the backend is complete. Four confirmed vulnerabilities were reported: a critical OAuth mock bypass, OTP plaintext logging, round
  super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on
   a secondary account.
  - Recommendation: Add super_admin to the blocklist in
   importUsersXlsx, mirroring the existing restriction
  in the single-create endpoint schema. If super_admin
  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

✻ Churned for 6m 38s

※ recap: Security review of the backend is complete. Four confirmed vulnerabilities were reported: a critical OAuth mock bypass, OTP plaintext logging, round
  super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on
   a secondary account.
  - Recommendation: Add super_admin to the blocklist in
   importUsersXlsx, mirroring the existing restriction
  in the single-create endpoint schema. If super_admin
  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

✻ Churned for 6m 38s

※ recap: Security review of the backend is complete. Four confirmed vulnerabilities were reported: a critical OAuth mock bypass, OTP plaintext logging, round
  super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on
   a secondary account.
  - Recommendation: Add super_admin to the blocklist in
   importUsersXlsx, mirroring the existing restriction
  in the single-create endpoint schema. If super_admin
  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

✻ Churned for 6m 38s

※ recap: Security review of the backend is complete. Four confirmed vulnerabilities were reported: a critical OAuth mock bypass, OTP plaintext logging, round
  super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on
   a secondary account.
  - Recommendation: Add super_admin to the blocklist in
   importUsersXlsx, mirroring the existing restriction
  in the single-create endpoint schema. If super_admin
  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

✻ Churned for 6m 38s

※ recap: Security review of the backend is complete. Four confirmed vulnerabilities were reported: a critical OAuth mock bypass, OTP plaintext logging, round
  super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on
   a secondary account.
  - Recommendation: Add super_admin to the blocklist in
   importUsersXlsx, mirroring the existing restriction
  in the single-create endpoint schema. If super_admin
  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

✻ Churned for 6m 38s

※ recap: Security review of the backend is complete. Four confirmed vulnerabilities were reported: a critical OAuth mock bypass, OTP plaintext logging, round
  status escalation by admins, and super_admin creation via XLSX import without OTP. (disable recaps in /config)
  super_admin uploads an XLSX with a row specifying
  role=super_admin for a target account → account is
  immediately promoted to super_admin with no OTP, no
  second-factor, and no role.override audit event. The
  attacker has silently persisted super_admin access on
   a secondary account.
  - Recommendation: Add super_admin to the blocklist in
   importUsersXlsx, mirroring the existing restriction
  in the single-create endpoint schema. If super_admin
  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.

  provisioning via import is ever intentional, wire it
  through the same OTP flow used by
  /auth/role-override/otp/* and call
  sessionService.revokeAll for affected users.
