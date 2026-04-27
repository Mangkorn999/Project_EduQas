# SRS Review — EILA Web Evaluation System

**วันที่ทำการตรวจสอบ:** 2026-04-23  
**เวอร์ชัน SRS:** 1.4  
**ผู้ตรวจสอบ:** Code Review Assistant

---

## สรุปผล

| หมวดหมู่ | จำนวน | ลำดับความสำคัญ |
|---------|------|------------|
| Missing Requirements | 10 | 🔴 High: 5, 🟡 Medium: 3, 🟢 Low: 2 |
| Ambiguous Requirements | 8 | 🔴 High: 3, 🟡 Medium: 4, 🟢 Low: 1 |
| Conflicting Requirements | 3 | 🔴 High: 2, 🟡 Medium: 1 |
| Untestable Requirements | 7 | 🔴 High: 2, 🟡 Medium: 4, 🟢 Low: 1 |
| Security Gaps | 14 | 🔴 High: 8, 🟡 Medium: 5, 🟢 Low: 1 |

**รวมปัญหาทั้งหมด: 42 ข้อ**

---

## 1. Missing Requirements (ขาดข้อกำหนด)

| # | ปัญหา | ที่อยู่ใน SRS | Severity | โซลูชันที่แนะนำ |
|---|-------|------------|----------|------------|
| M1 | **ไม่มี Requirement สำหรับ Error Handling** เช่น validation form input, handle invalid JSON, timeout API | - | 🔴 High | เพิ่ม "FR-ERR01: System must validate all user inputs and return clear error messages" + "FR-ERR02: Handle timeout on external API (PSU Passport)" |
| M2 | **ไม่มี Requirement สำหรับ Session Management** เช่น session timeout, logout, concurrent session handling | Section 3 (Authentication) | 🔴 High | เพิ่ม "FR-AUTH01: User session expires after 30 minutes of inactivity" + "FR-AUTH02: Support logout functionality" |
| M3 | **ไม่มี Requirement สำหรับ Audit Logging** ใครสร้าง/แก้ไข/ลบฟอร์ม/คำตอบ เมื่อไหร่ | Section 4 | 🔴 High | เพิ่ม "FR-U05: eila_admin สามารถดู Audit Log ของการเปลี่ยนแปลงทั้งระบบ" + Schema: `audit_logs` table |
| M4 | **ไม่มี Requirement สำหรับ Concurrent Form Editing** ถ้า Admin 2 คนแก้ฟอร์มเดียวกันพร้อมกัน | Section 4.1 | 🔴 High | เพิ่ม "FR-F13: Implement optimistic locking / last-write-wins strategy" หรือ "implement form locking mechanism" |
| M5 | **ไม่มี Requirement สำหรับ Data Retention / Archive** ข้อมูลเก่าเก็บนานแค่ไหน ลบหรือเปล่า | Section 6 | 🟡 Medium | เพิ่ม "NFR-10: Data older than 2 years must be archived or deleted" + backup policy |
| M6 | **ไม่มี Requirement สำหรับ Backup / Recovery** ระบบมี backup ไหม, recovery plan ไหม | - | 🟡 Medium | เพิ่ม "NFR-11: Daily backup of database at 2 AM, 7-day retention, recovery time < 1 hour" |
| M7 | **ไม่มี Requirement สำหรับ Form Versioning / Change History** ถ้าแก้ฟอร์มหลังมีคน submit แล้ว | Section 4.1 | 🟡 Medium | เพิ่ม "FR-F20: Track form structure changes, maintain form version history" |
| M8 | **ไม่มี Requirement สำหรับ API Documentation** Swagger/OpenAPI spec ไหม | Section 10 | 🟢 Low | เพิ่ม "NFR-12: Implement OpenAPI 3.0 specification for all REST APIs" |
| M9 | **ไม่มี Requirement สำหรับ Performance** response time target, concurrent users, query optimization | - | 🟢 Low | เพิ่ม "NFR-13: API response time < 500ms for 95th percentile, support 1000 concurrent users" |
| M10 | **ไม่มี Requirement สำหรับ Email Delivery Failure** ถ้า email ส่งไม่ไปต้องทำไง | Section 4.8 | 🟡 Medium | เพิ่ม "FR-N10: If email fails, retry 3 times with exponential backoff + log error" |

---

## 2. Ambiguous Requirements (คลุมเครือ)

| # | ข้อกำหนด | ตีความได้หลายแบบ | Severity | แนะนำการชี้แจง |
|---|----------|----------------|----------|-------------|
| A1 | **FR-F05: กำหนด Role ที่จะรับฟอร์ม (เฉพาะ faculty scope)** | "Role ที่จะรับฟอร์ม" แปลว่าอะไร? Respondent ต้อง Match Role นั้นไหม? แล้ว Faculty นั้นล่ะ? | 🔴 High | ชี้แจง: "Form faculty_scope มี target_roles หลายตัวได้ เช่น teacher + staff ใน Faculty X เท่านั้น Respondent ต้อง Match faculty_id AND role" |
| A2 | **FR-R01: Respondent เห็นฟอร์ม "role และ Faculty ตัวเอง"** | "Faculty ตัวเอง" มาจากไหน? faculty_id ใน form table? หรือ user's faculty_id? | 🔴 High | ชี้แจง: "Respondent เห็นฟอร์มหาก: (1) form.scope=university ทั้งหมด หรือ (2) form.scope=faculty AND form.faculty_id=user.faculty_id AND user.role IN form_target_roles" |
| A3 | **FR-T03: faculty_admin เห็นเฉพาะ Template ของ Faculty ตัวเอง + global** | "Faculty ตัวเอง" = created_by.faculty_id? หรือ template.faculty_id? | 🟡 Medium | ชี้แจง: "Template where scope='faculty' AND (faculty_id = user.faculty_id OR created_by = user.id) OR scope='global'" |
| A4 | **FR-IE07: รองรับ .json จากระบบอื่น "หาก Format ถูกต้อง"** | Format ถูกต้องคืออะไร? ต้อง Match 100% eila schema ไหม? | 🟡 Medium | ชี้แจง: "JSON ต้องมี questions array ตามส่วน 7.2 Validation Rules ที่จำเป็น (questions, question_text, question_type) สนใจ optional fields" |
| A5 | **Section 4.1: Status Flow "closed → open ได้"** | "เปิดรอบใหม่" คือแล้ว Respondent ส่งมาได้อีกไหม? ยังใช้ responses เดิมไหม? | 🟡 Medium | ชี้แจง: "closed→open ใหม่: (1) ไม่ลบ responses เก่า (2) Respondent สามารถ update response เดิมได้ (Upsert) หรือ submit ใหม่?" |
| A6 | **FR-U01-U03: eila_admin จัดการ faculties / users / roles** | "เพิ่ม/ลบ/แก้ไข" คือ hard delete? soft delete? bulk operations ได้ไหม? | 🟡 Medium | ชี้แจง: "Support bulk operations (XLSX import), soft delete (mark inactive), audit trail" |
| A7 | **NFR-05: รองรับ Admin หลายคนพร้อมกัน** | "พร้อมกัน" นั่นคือ 2 คน? 10 คน? 100 คน? concurrent API call limit? | 🟢 Low | ชี้แจง: "Support ≥ 10 concurrent admin users editing different forms simultaneously, same form = lock mechanism" |
| A8 | **FR-N02, FR-N03: เตือน "เหลือ 3 วัน / 1 วัน"** | "วัน" หมายถึง 3×24 ชั่วโมง? หรือ calendar days? เวลาไหน ของวัน? | 🟡 Medium | ชี้แจง: "Reminder sent at close_at minus 72 hours and 24 hours (respecting PSU timezone UTC+7)" |

---

## 3. Conflicting Requirements (ขัดแย้ง)

| # | ปัญหา | Conflict Details | Severity | วิธีแก้ |
|---|------|-----------------|----------|--------|
| C1 | **FR-F10 vs FR-F11 ความสามารถของ faculty_admin** | FR-F10: faculty_admin สร้าง faculty scope เท่านั้น แต่ FR-F12: universe scope ไม่มี target_roles (ทั้งหมดเห็น) → faculty_admin ไม่สามารถ assign respondent ให้ universe scope ได้ แต่เหมือน missing feature | 🔴 High | ชี้แจง: "faculty_admin ไม่ควรมีสิทธิ์สร้าง universe scope (beeline ถูก). ถ้า university scope ต้องได้รับมาจาก eila_admin ผ่าน shared pool" |
| C2 | **FR-T03 vs FR-T04: Template Sharing** | FR-T03: faculty_admin เห็นแต่ Faculty ตัวเองเท่านั้น → FR-T04: แต่ Import ได้จากอื่น? ใครสร้างให้ import? | 🔴 High | ชี้แจง: "Template ของ Faculty อื่นต่อให้อยากได้ต้อง request eila_admin เอา หรือ Export/Import via JSON (manual process, not auto-share)" |
| C3 | **NFR-04 vs FR-R05: Data Integrity** | NFR-04: "Tamper-proof" data แต่ FR-R05: "เก็บเฉพาะคำตอบล่าสุด" → ถ้าแก้ไขแล้วลบ original ล่ะ audit trail ไม่เกิด | 🟡 Medium | ชี้แจง: "ต้องเลือกระหว่าง (A) Upsert + Audit Log (track changes) หรือ (B) Soft delete (keep history)" |

---

## 4. Untestable Requirements (ไม่สามารถเขียน Test Case ได้)

| # | Requirement | ปัญหา | Severity | วิธีแก้ |
|---|-------------|-------|----------|--------|
| U1 | **NFR-07: Scheduler ทุก 1 นาที** | "ทุก 1 นาที" เป็นเวลาน้อยเกินไป ยาก test ระหว่าง CI/CD + ไม่ mention tolerance (±30s OK ไหม?) | 🔴 High | ใช้ "Scheduler checks status every 1-5 minutes" + acceptance: "98% of forms change status within 5 minutes of trigger time" |
| U2 | **NFR-02: Responsive Mobile** | ไม่ mention screen sizes (iPhone 5S 320px? iPhone 12 390px? iPad 768px?) iOS/Android? Browser ไหน? | 🔴 High | ชี้แจง: "Support breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop). Test on Safari iOS 13+, Chrome Android 8+" |
| U3 | **FR-D04: Bar Chart, สรุป Short Text** | ไม่mention ลักษณะ chart: grouped? stacked? มีขอบเขตข้อมูลไหม? (top 10 short text comments?) | 🟡 Medium | ชี้แจง: "Bar chart sorted by count descending, max 20 bars. Short text: max 100 comments, sorted by recency" |
| U4 | **FR-N02, FR-N03: Reminder timing** | เตือน "3 วัน" "1 วัน" แต่ไม่mention เวลาไหนของวัน test ได้ยากเพราะ timezone-dependent | 🟡 Medium | ชี้แจง: "Notification sent at 9:00 AM PSU timezone (UTC+7) when close_at minus 3 days / 1 day reached" |
| U5 | **NFR-03: Authorization ทุก API** | "ทุก API" มี API ไหนคิดว่าไม่ต้อง auth? (Public form list API ไหม?) | 🟡 Medium | ชี้แจง: "เก็บ Whitelist: GET /api/forms/{id} public (no auth) แต่ response ต้อง filter ตาม scope/role" |
| U6 | **NFR-06: Validate Import Format** | ไม่ mention เจาะจง validation: max file size ไหม? max questions? max text length? | 🟢 Low | ชี้แจง: "Max file: 5 MB, max 500 questions, max text 500 chars" |
| U7 | **FR-D05: แสดงจำนวนผู้ตอบ %** | ไม่mention "% ของผู้ที่ยังไม่ตอบ" คิดจาก what base? (target role count? ทั้งระบบ?) | 🟡 Medium | ชี้แจง: "% = (respondents_who_answered / total_form_target_roles) × 100" หรือ "/ all_users_in_system"? |

---

## 5. Security Gaps (ช่องโหว่ด้านความปลอดภัย)

| # | ช่องโหว่ | ที่อยู่ใน SRS | Impact | Severity | โซลูชัน |
|---|---------|------------|--------|----------|---------|
| S1 | **ไม่มี HTTPS/TLS Requirement** ทั้ง Frontend ↔ Backend ↔ PSU Passport | Section 1.3 (Tech Stack) | Data in transit unencrypted → credential theft, man-in-the-middle | 🔴 High | เพิ่ม "NFR-SEC01: All communication must use HTTPS with TLS 1.2+" |
| S2 | **ไม่มี CSRF Protection Requirement** POST/PUT/DELETE endpoints vulnerable | Section 4 | Attacker can trick user to perform unwanted actions | 🔴 High | เพิ่ม "NFR-SEC02: Implement CSRF tokens (SameSite cookies + CSRF token in request body)" |
| S3 | **ไม่มี XSS Prevention Requirement** User input (form title, question text, short text answers) | Section 4.1, 4.3, 4.5 | Injected scripts execute in other users' browsers | 🔴 High | เพิ่ม "NFR-SEC03: All user input must be sanitized/escaped before output. Use React/Next.js built-in escaping" |
| S4 | **ไม่มี SQL Injection Prevention** Only mention "PostgreSQL" but no explicit ORM/prepared statement requirement | Section 1.3 | Database compromise, data theft/loss | 🔴 High | เพิ่ม "NFR-SEC04: Use parameterized queries / ORM (Prisma/Sequelize) - NO string concatenation in queries" |
| S5 | **ไม่มี API Rate Limiting** No protection against brute force / DDoS | Section 4 | Attackers can overwhelm system, user enumeration | 🟡 Medium | เพิ่ม "NFR-SEC05: Rate limit: 100 requests/min per IP, 50 requests/min per user" |
| S6 | **ไม่มี Input Validation Detail** File upload (JSON import) ไม่mention virus scan, max size | Section 4.4 | Malicious file upload → RCE, DoS | 🟡 Medium | เพิ่ม "NFR-SEC06: Validate file type (JSON only), max size 5MB, scan for malicious content" |
| S7 | **ไม่มี Session Hijacking Prevention** No mention of secure cookies, httpOnly flag, SameSite | Section 3 | Attackers steal session tokens | 🟡 Medium | เพิ่ม "NFR-SEC07: Session cookies must use: Secure flag, HttpOnly flag, SameSite=Strict" |
| S8 | **ไม่มี Authentication Refresh Token Strategy** PSU Passport token expiration handling? | Section 3.1 | Token expires → API fails, user experience breaks | 🔴 High | ชี้แจง: "Token expiry time? Refresh token flow? Or force re-login?" |
| S9 | **Permission Check ที่ Faculty Level ไม่ชัด** Section 6 (DB Schema) form.faculty_id เก็บไว้ แต่ไม่mention checking ทุก query | Section 4.1 | faculty_admin อาจ access form ของ faculty อื่น if query not filtered | 🔴 High | เพิ่ม "NFR-SEC08: All form queries must filter by user.faculty_id. NFR-09 move to NFR-SEC08 (emphasize)" |
| S10 | **ไม่มี Audit Logging Requirement** ใครเปลี่ยนอะไรเมื่อไหร่ | Section 4 | Cannot investigate security incidents | 🟡 Medium | เพิ่ม "NFR-SEC09: Log all admin actions: create/update/delete forms, user management, template changes. Keep for 1 year" |
| S11 | **Override Role Mechanism ไม่ชัด** Section 3.2 mentions "check override" แต่ไม่mention how to prevent unauthorized override? | Section 3.2 | Privilege escalation → user becomes eila_admin | 🔴 High | ชี้แจง: "Override role change requires 2FA + audit log + only eila_admin can do it" |
| S12 | **PSU Passport OAuth Flow ไม่ mention** PKCE? state parameter? token validation? | Section 3.1 | OAuth token substitution attack | 🟡 Medium | เพิ่ม "NFR-SEC10: Implement PKCE for OAuth, validate state parameter, verify JWT signature" |
| S13 | **ไม่มี Encryption at Rest** Database ไม่mention encryption for sensitive fields (email, password hash if any) | Section 6 | Database breach → expose personal data | 🟡 Medium | เพิ่ม "NFR-SEC11: Encrypt sensitive fields (email, responses) at rest using AES-256" |
| S14 | **ไม่มี Logging & Monitoring** No mention of security monitoring, intrusion detection | Section 4 | Cannot detect active attacks in real-time | 🟢 Low | เพิ่ม "NFR-SEC12: Monitor failed login attempts, API errors, unusual query patterns" |

---

## สรุปจำนวนปัญหาตามระดับความสำคัญ

### 🔴 High Severity (ปัญหาวิกฤต ต้องแก้ก่อน Dev)

- M1, M2, M4 (Missing: Error Handling, Session Mgmt, Concurrent Editing)
- A1, A2 (Ambiguous: Faculty scope, Form visibility logic)
- C1, C2 (Conflicting: faculty_admin scope, Template sharing)
- U1, U2 (Untestable: Scheduler timing, Mobile responsive)
- S1, S2, S3, S4, S8, S9, S11 (Security: HTTPS, CSRF, XSS, SQL Injection, Auth Flow, Permissions, Override)

**รวม: 17 ข้อ — ต้องแก้ไขก่อน Sprint Planning**

### 🟡 Medium Severity (ควรแก้ให้ชัดเจน)

- M3, M5, M6, M10 (Missing: Audit Logs, Data Retention, Backup, Email Failure)
- A3, A4, A5, A6, A8 (Ambiguous: Template scope, JSON format, Status flow)
- C3 (Conflicting: Tamper-proof vs Upsert)
- U3, U4, U5, U7 (Untestable: Chart details, Reminder timing, Authorization scope)
- S5, S6, S7, S10, S12, S13 (Security: Rate Limiting, File Upload, Session Cookies, Audit Log, OAuth PKCE)

**รวม: 18 ข้อ — ควรแก้ไขก่อนเริ่ม Development**

### 🟢 Low Severity (ปรับปรุงเมื่อมีเวลา)

- M7, M8, M9 (Missing: Form Versioning, API Docs, Performance)
- A7 (Ambiguous: Concurrent admin count)
- U6 (Untestable: File validation limits)
- S14 (Security: Logging & Monitoring)

**รวม: 7 ข้อ — แก้ไขได้ทีหลัง**

---

## 🎯 Action Items ก่อน Sprint Planning

### Phase 0: SRS Clarification (ต้องทำวันนี้)

1. ✏️ **ชี้แจง Faculty Scope Logic** — เขียน pseudocode สำหรับ `canUserSeeForm()` function
2. ✏️ **ชี้แจง faculty_admin Rights** — มี universe scope form ไหม? ถ้ามี ใครสร้าง?
3. ✏️ **เพิ่ม Error Handling Spec** — validation rules, timeout behavior, error response format
4. ✏️ **เพิ่ม Security Requirements** — HTTPS, CSRF, XSS, SQL Injection, Rate Limiting, Audit Log
5. ✏️ **เลือก Concurrent Editing Strategy** — Optimistic locking? Pessimistic locking? Last-write-wins?

### Phase 1: Update SRS v1.5

- Resolve ทั้ง 17 High severity items
- Clarify ทั้ง 18 Medium severity items
- เพิ่ม Database schema สำหรับ `audit_logs`, `form_versions`, etc.
- เพิ่ม API Error Response Schema

### Phase 2: Start Development

- Create Test Cases จากทั้ง 42 points นี้
- Create Security Checklist (Owasp Top 10)

---

## 📋 Detailed Recommendations

### Security Additions (Draft)

```markdown
## Additional NFR: Security (NFR-SEC-01 to NFR-SEC-12)

**NFR-SEC-01:** All API communication must use HTTPS with minimum TLS 1.2
**NFR-SEC-02:** Implement CSRF protection using SameSite cookies + CSRF token validation
**NFR-SEC-03:** Sanitize all user input before output (use React built-in escaping)
**NFR-SEC-04:** Use parameterized queries / ORM for all database operations (Prisma recommended)
**NFR-SEC-05:** Rate limit: 100 requests/min per IP, 50 per user per min
**NFR-SEC-06:** Validate file uploads: type (JSON only), max 5MB, content scanning
**NFR-SEC-07:** Secure session cookies: Secure flag + HttpOnly + SameSite=Strict
**NFR-SEC-08:** All queries must filter by user.faculty_id at application layer (defense in depth)
**NFR-SEC-09:** Audit log all admin actions (create/update/delete), retain for 12 months
**NFR-SEC-10:** Implement OAuth PKCE flow + state parameter validation + JWT signature verification
**NFR-SEC-11:** Encrypt sensitive fields (email, responses) at rest using AES-256
**NFR-SEC-12:** Monitor security events: failed logins (>5/min triggers alert), API errors, unusual patterns
```

### Ambiguity Resolutions (Draft)

```markdown
## A1: Faculty Scope Form Visibility

**Requirement:** 
- Form with scope='faculty' is visible to Respondents ONLY if:
  - user.faculty_id == form.faculty_id AND
  - user.role IN form_target_roles
- Form with scope='university' is visible to ALL respondents regardless of role/faculty

**Test Case:**
- faculty_admin from IT creates form with faculty scope → only teacher/staff/student from IT see
- eila_admin creates universe scope form → all respondents see

## A2: Role Override Logic

**Requirement:**
- PSU Passport returns base role (student/teacher/staff)
- Admin can override to (faculty_admin / executive / eila_admin)
- Override tracked in users.role field + audit log
- Only eila_admin can modify override
- Change requires 2FA verification

**Table:**
| Scenario | role (from PSU) | users.role (after override) | visible as |
|----------|-----------------|----------------------------|------------|
| Student, no override | student | student | respondent |
| Student, promoted | student | faculty_admin | faculty admin |
```
