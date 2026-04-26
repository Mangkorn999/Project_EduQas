# eila SRS v1.9 — Patch Document

วันที่: 2026-04-24  
อ้างอิง: SRS v1.8  
เพิ่มโดย: Codex

---

## Changelog v1.9

| ลำดับ | FR/NFR ID | หัวข้อ | ประเภท | ผู้รับผิดชอบ |
|---|---|---|---|---|
| 59 | FR-AUTH-JWT | JWT Token Lifecycle Management | NEW | Backend |
| 60 | FR-DATA-DEL | Soft Delete Policy (PDPA Compliance) | NEW | Both |
| 61 | NFR-PERF-CONCURRENT | Concurrent Users & Load Target | NEW | Backend / DevOps |
| 62 | FR-EMAIL-RETRY | Email Delivery Retry Mechanism | NEW | Backend |
| 63 | FR-IE-VALIDATE | Import JSON Schema Validation | NEW | Both |
| 64 | FR-AUTH-SESSION | Session Timeout Policy | แก้ไข/ขยายจาก FR-AUTH01-04 v1.8 | Both |
| 65 | FR-TMPL-LIFECYCLE | Template Deprecation & Ownership | NEW | Both |
| 66 | NFR-ACCESS | Accessibility Standard (WCAG 2.1 AA) | NEW | Frontend |
| 67 | NFR-DR | Disaster Recovery & Backup Strategy | แก้ไข/ขยายจาก NFR-11 v1.8 | DevOps |
| 68 | FR-PH3 | Phase 3 Feature Scope | NEW | Both |

---

## [59] FR-AUTH-JWT — JWT Token Lifecycle Management

คำอธิบาย: เพิ่มข้อกำหนด lifecycle ของ `access_token` และ `refresh_token` ให้ชัดเจน เพื่อปิดช่องโหว่ด้าน security และรองรับ revoke / rotation / reuse detection

Assigned To: Backend

### Requirement

- **FR-AUTH-JWT.1:** ระบบ **SHALL** กำหนด `access_token` มีอายุไม่เกิน **15 นาที** นับจากเวลา issue
- **FR-AUTH-JWT.2:** ระบบ **SHALL** กำหนด `refresh_token` มีอายุไม่เกิน **30 วัน** นับจากเวลา issue
- **FR-AUTH-JWT.3:** ระบบ **SHALL** ใช้ **refresh token rotation** ทุกครั้งที่เรียก endpoint refresh สำเร็จ โดยออก `access_token` ใหม่และ `refresh_token` ใหม่ พร้อม revoke token เดิมทันที
- **FR-AUTH-JWT.4:** ระบบ **SHALL NOT** เก็บ `refresh_token` แบบ plain text ในฐานข้อมูล และ **SHALL** เก็บเฉพาะ token hash พร้อม metadata อย่างน้อย `user_id`, `issued_at`, `expires_at`, `revoked_at`, `replaced_by_token_id`, `ip_address`, `user_agent`
- **FR-AUTH-JWT.5:** ระบบ **SHALL** มี endpoint อย่างน้อยดังนี้:
  - `POST /api/auth/refresh`
  - `POST /api/auth/revoke`
  - `POST /api/auth/revoke-all`
- **FR-AUTH-JWT.6:** เมื่อ user ทำ Logout ปกติ ระบบ **SHALL** revoke refresh token ของ session ปัจจุบันทันที
- **FR-AUTH-JWT.7:** เมื่อ user เลือก Logout ทุกอุปกรณ์ หรือ admin ทำ `revoke-all` ระบบ **SHALL** revoke refresh token ทุกตัวของ user คนนั้นทันที
- **FR-AUTH-JWT.8:** เมื่อ eila_admin ทำ role override กับ user ใด ระบบ **SHALL** revoke refresh token ทุกตัวของ user เป้าหมายทันที และ session ที่ใช้งานอยู่ **SHALL** ถูกบังคับ logout ใน request ถัดไป
- **FR-AUTH-JWT.9:** เมื่อ user ถูก soft delete หรือถูก set `is_active=false` ระบบ **SHALL** revoke refresh token ทุกตัวของ user นั้นทันที
- **FR-AUTH-JWT.10:** ระบบ **SHALL** รองรับ **refresh token reuse detection** โดยเมื่อพบว่า refresh token ที่ถูก revoke หรือถูก replace แล้วถูกนำกลับมาใช้ซ้ำ ระบบต้อง:
  - revoke token chain ทั้งหมดที่เกี่ยวข้องกับ session family นั้น
  - บันทึก security event ลง audit/security log
  - บังคับให้ user login ใหม่ทุกอุปกรณ์ใน family นั้น
- **FR-AUTH-JWT.11:** ระบบ **SHOULD** ผูก refresh token กับ device/session context เช่น `user_agent`, `ip_address` เพื่อใช้ประกอบการตรวจจับ anomaly
- **FR-AUTH-JWT.12:** Response ของ endpoint refresh **SHALL** ไม่ส่งข้อมูล token เดิมกลับมา และ **SHALL** return token pair ใหม่เท่านั้นเมื่อ validation ผ่านครบ

### Acceptance Criteria

- เรียก `POST /api/auth/refresh` ด้วย refresh token ที่ valid แล้วต้องได้ token pair ใหม่ และ token เดิมต้องใช้งานไม่ได้อีก
- ใช้ refresh token เดิมซ้ำหลัง rotation ต้องถูก reject ด้วยสถานะ `401` หรือ `403` ตาม policy และเกิด security log 1 รายการ
- เมื่อ admin override role ของ user ระบบต้องทำให้ refresh token เดิมทั้งหมดของ user ใช้งานไม่ได้ภายใน 1 นาที
- เมื่อ user soft delete แล้ว เรียก refresh endpoint ด้วย token เดิมต้องไม่สำเร็จ
- ฐานข้อมูลต้องไม่พบ plaintext refresh token ในทุก environment

### Edge Cases & Constraints

- ถ้า access token หมดอายุ แต่ refresh token ยัง valid ระบบ **SHALL** อนุญาต refresh ได้โดยไม่ต้อง login ใหม่
- ถ้า refresh token หมดอายุแล้ว ระบบ **SHALL** redirect ให้ login ใหม่ และต้องไม่ออก token ใหม่
- ถ้า client ส่ง refresh request ซ้ำพร้อมกัน 2 ครั้งด้วย token เดียวกัน ระบบ **SHALL** ยอมรับได้เพียง 1 ครั้ง และอีกคำขอหนึ่งต้องถูก reject
- การ revoke token **SHALL** เป็น idempotent เพื่อป้องกัน race condition

---

## [60] FR-DATA-DEL — Soft Delete Policy (PDPA Compliance)

คำอธิบาย: กำหนดนโยบาย Soft Delete และการเก็บรักษาข้อมูลให้สอดคล้องกับ PDPA และการตรวจสอบย้อนหลัง

Assigned To: Both

### Requirement

- **FR-DATA-DEL.1:** ระบบ **SHALL** ใช้ `deleted_at` timestamp เป็นกลไก **Soft Delete** แทนการลบจริงสำหรับ entity ที่กำหนด
- **FR-DATA-DEL.2:** Entity ต่อไปนี้ **SHALL** รองรับ soft delete: `users`, `forms`, `responses`, `templates`
- **FR-DATA-DEL.3:** Entity ต่อไปนี้ **MAY** hard delete ได้ตาม policy: `audit_logs_archive` ที่พ้น retention period แล้ว, `refresh_tokens` ที่ expire และพ้น grace period แล้ว
- **FR-DATA-DEL.4:** เมื่อ soft delete user ระบบ **SHALL** revoke refresh token ทั้งหมดของ user นั้นทันที
- **FR-DATA-DEL.5:** เมื่อ soft delete user ระบบ **SHALL** ซ่อน user จาก list และ search result ทั้งหมดที่ใช้ operational UI โดย default
- **FR-DATA-DEL.6:** เมื่อ soft delete user ระบบ **SHALL** เก็บ `responses` เดิมไว้เพื่อการวิเคราะห์และการตรวจสอบย้อนหลัง แต่ข้อมูลระบุตัวตน **SHALL** ถูก anonymize ตาม policy ที่มหาวิทยาลัยอนุมัติ
- **FR-DATA-DEL.7:** เมื่อ soft delete form ระบบ **SHALL** ซ่อน form จาก list ปกติของ user ทุก role ยกเว้น admin view ที่ได้รับสิทธิ์
- **FR-DATA-DEL.8:** Responses ของ form ที่ถูก soft delete **SHALL** ยังเข้าถึงได้โดย `eila_admin` และ `executive` ตาม retention period
- **FR-DATA-DEL.9:** ระบบ **SHALL** เก็บข้อมูล operational และ archival ที่เกี่ยวกับการประเมินไว้ไม่น้อยกว่า **7 ปี** เว้นแต่กฎหมายหรือนโยบายมหาวิทยาลัยกำหนดไว้สูงกว่า
- **FR-DATA-DEL.10:** ระบบ **SHALL** มี flow รองรับ **PDPA Right to Erasure** โดย user ส่งคำขอลบข้อมูลผ่านช่องทางที่มหาวิทยาลัยกำหนด และ eila_admin ต้อง review / approve / reject พร้อมเหตุผล
- **FR-DATA-DEL.11:** เมื่อคำขอ Right to Erasure ได้รับการอนุมัติ ระบบ **SHALL** anonymize personal data ที่ลบได้ตามกฎหมาย และ **SHALL NOT** ลบข้อมูลที่จำเป็นต่อภาระผูกพันทางกฎหมาย การเงิน หรือ audit
- **FR-DATA-DEL.12:** ทุกการ soft delete, restore, anonymize, และ hard delete **SHALL** ถูกบันทึกลง audit log

### Acceptance Criteria

- soft delete user แล้ว user คนนั้นต้อง login ไม่ได้ทันที
- soft delete form แล้ว form ต้องไม่แสดงในหน้ารายการทั่วไปของ respondent และ faculty_admin
- ตรวจสอบ DB แล้ว entity ที่ soft delete ต้องยังคงอยู่พร้อม `deleted_at` ไม่เป็น null
- หลังอนุมัติ Right to Erasure ต้องไม่สามารถค้นพบ PII ของ user ใน operational UI ได้
- report/audit view ของ admin ต้องยังแสดงข้อมูลที่กฎหมายบังคับให้เก็บได้ภายใน 7 ปี

### Edge Cases & Constraints

- การ anonymize responses **SHALL** ไม่ทำให้ aggregate analytics ผิดเพี้ยน
- ถ้า user ที่ถูกลบเป็นเจ้าของ template ระบบต้องโอน ownership ตาม FR-TMPL-LIFECYCLE
- ระบบ **SHOULD** รองรับ restore entity ที่ soft delete ได้ เฉพาะ entity ที่กฎหมายและ policy อนุญาต

---

## [61] NFR-PERF-CONCURRENT — Concurrent Users & Load Target

คำอธิบาย: เพิ่ม non-functional requirement เรื่องจำนวน concurrent users, SLA, peak load และ graceful degradation

Assigned To: Backend / DevOps

### Requirement

- **NFR-PERF-CONCURRENT.1:** ระบบ **SHALL** รองรับ **normal load 500 concurrent users**
- **NFR-PERF-CONCURRENT.2:** ระบบ **SHALL** รองรับ **peak load 2,000 concurrent users** เป็นเวลาไม่น้อยกว่า 30 นาที โดยไม่เกิด data loss
- **NFR-PERF-CONCURRENT.3:** ภายใต้ normal load, operation ประเภท read **SHALL** มี response time p95 ไม่เกิน **800 ms**
- **NFR-PERF-CONCURRENT.4:** ภายใต้ normal load, operation ประเภท write **SHALL** มี response time p95 ไม่เกิน **1.5 วินาที**
- **NFR-PERF-CONCURRENT.5:** ภายใต้ normal load, operation ประเภท export PDF/XLSX **SHALL** เริ่มตอบรับหรือ enqueue งานภายใน **3 วินาที**
- **NFR-PERF-CONCURRENT.6:** ภายใต้ peak load, ระบบ **SHOULD** รักษา read p95 ไม่เกิน **2 วินาที** และ write p95 ไม่เกิน **3 วินาที**
- **NFR-PERF-CONCURRENT.7:** ระบบ **SHOULD** ตั้งค่า database connection pool เริ่มต้นที่ **20-30 connections ต่อ application instance** และต้อง tune ตามผล load test ก่อน production
- **NFR-PERF-CONCURRENT.8:** ระบบ **SHALL** ทดสอบ load อย่างน้อย 3 สถานการณ์:
  - ช่วงเปิดเทอมที่มี form ใหม่จำนวนมาก
  - ช่วงปิดเทอมที่ admin export รายงานจำนวนมาก
  - วันสุดท้ายก่อน deadline form ปิด ที่ respondent ส่งพร้อมกันจำนวนมาก
- **NFR-PERF-CONCURRENT.9:** เมื่อ load เกิน capacity ระบบ **SHALL** ใช้ graceful degradation เช่น queue export job, limit background job concurrency, และ reject บาง request ด้วย `429 Too Many Requests` แทนการล่มทั้งระบบ
- **NFR-PERF-CONCURRENT.10:** Health dashboard และ monitoring **SHALL** แสดงอย่างน้อย CPU, memory, DB connections, queue length, API latency p95/p99, error rate

### Acceptance Criteria

- ผ่าน load test 500 concurrent users โดย read p95 <= 800 ms และ write p95 <= 1.5 s
- ผ่าน stress test 2,000 concurrent users โดยระบบไม่ crash และไม่มี data corruption
- เมื่อส่ง export จำนวนมากพร้อมกัน ระบบต้อง enqueue หรือ throttle ได้ และ API ไม่ timeout เกิน 3%
- เมื่อเกิน capacity ระบบต้องตอบ `429` หรือ queue response อย่างสม่ำเสมอแทน `500`

### Edge Cases & Constraints

- export ขนาดใหญ่ **SHOULD** ใช้ async/background job แทน synchronous response
- peak load ในวัน deadline **SHALL** ถูกใช้เป็น baseline scenario ทุกครั้งก่อน major release
- ตัวเลข pool size อาจปรับตามจำนวน CPU / DB instance ได้ แต่ต้องมีผล load test รองรับ

---

## [62] FR-EMAIL-RETRY — Email Delivery Retry Mechanism

คำอธิบาย: กำหนดกลไก retry, status tracking, fallback, และ admin observability สำหรับ email delivery

Assigned To: Backend

### Requirement

- **FR-EMAIL-RETRY.1:** ระบบ **SHALL** ติดตามสถานะ email แต่ละรายการอย่างน้อยเป็น `pending`, `sent`, `failed`
- **FR-EMAIL-RETRY.2:** เมื่อส่ง email ไม่สำเร็จ ระบบ **SHALL** retry ด้วย exponential backoff อย่างน้อย **3 ครั้ง** ตามลำดับ **1 นาที -> 5 นาที -> 15 นาที**
- **FR-EMAIL-RETRY.3:** หาก retry ครบแล้วยังล้มเหลว ระบบ **SHALL** mark email เป็น `failed` และบันทึก error detail ลง `notification_logs` หรือ email delivery log
- **FR-EMAIL-RETRY.4:** ระบบ **SHALL** มี dead letter queue หรือ equivalent failed-job storage สำหรับ email ที่ส่งไม่สำเร็จหลัง retry ครบ
- **FR-EMAIL-RETRY.5:** หาก email notification ล้มเหลว แต่ event นั้นรองรับ in-app notification ระบบ **SHALL** ยังส่ง in-app notification ตามปกติ
- **FR-EMAIL-RETRY.6:** หาก email notification ล้มเหลวครบทุก retry ระบบ **SHOULD** แจ้ง admin ผ่าน in-app notification หรือ admin dashboard alert
- **FR-EMAIL-RETRY.7:** eila_admin **SHALL** สามารถดู email delivery status, latest error, retry count, และ timestamp ล่าสุดได้จาก admin UI หรือ admin API
- **FR-EMAIL-RETRY.8:** ระบบ **SHOULD** รองรับ manual retry โดย admin สำหรับ email ที่อยู่ในสถานะ `failed`

### Acceptance Criteria

- บังคับให้ SMTP fail แล้วระบบต้อง retry ตามลำดับ 1, 5, 15 นาที
- หลัง retry ครบ ระบบต้องเปลี่ยนสถานะเป็น `failed`
- event ที่มี in-app notification ต้องยังเห็น notification แม้ email ส่งไม่สำเร็จ
- admin ต้องดูสถานะ email ล่าสุดได้อย่างน้อย 1 หน้าจอหรือ 1 endpoint

### Edge Cases & Constraints

- ระบบ **SHALL** ป้องกัน duplicate email send จาก job ซ้ำด้วย idempotency key หรือ job lock
- ถ้า SMTP กลับมาใช้งานได้ระหว่าง retry รอบถัดไป ระบบ **SHALL** เปลี่ยนสถานะเป็น `sent` ทันทีเมื่อส่งสำเร็จ

---

## [63] FR-IE-VALIDATE — Import JSON Schema Validation

คำอธิบาย: เพิ่ม schema และ validation rule ที่ formal สำหรับการ import form JSON

Assigned To: Both

### Requirement

- **FR-IE-VALIDATE.1:** ระบบ **SHALL** validate import JSON ตาม schema กลางก่อนเริ่มบันทึกข้อมูล
- **FR-IE-VALIDATE.2:** JSON import **SHALL** มี field required อย่างน้อย:
  - `eila_schema_version`
  - `form_title`
  - `questions`
- **FR-IE-VALIDATE.3:** แต่ละ item ใน `questions` **SHALL** มี field required อย่างน้อย:
  - `order`
  - `question_text`
  - `question_type`
  - `required`
- **FR-IE-VALIDATE.4:** Field optional **MAY** มีได้ เช่น `description`, `help_text`, `options`, `validation_rules`, `section`
- **FR-IE-VALIDATE.5:** ระบบ **SHALL** validate ดังนี้:
  - type checking ทุก field
  - required fields ต้องมีครบ
  - enum values ต้องอยู่ในค่าที่ระบบรองรับ
  - `question_text` ยาวไม่เกิน 1000 chars
  - `form_title` ยาวไม่เกิน 200 chars
  - `questions` ต้องไม่เกิน 500 รายการ
- **FR-IE-VALIDATE.6:** เมื่อ import ผิดพลาดกลางคัน ระบบ **SHALL** ทำ **rollback ทั้งหมด** และ **SHALL NOT** ทำ partial save
- **FR-IE-VALIDATE.7:** Error report ของ import **SHALL** return structured format อย่างน้อยประกอบด้วย `code`, `message`, `field`, `question_index` หรือ `path`, และ `expected`
- **FR-IE-VALIDATE.8:** ระบบ **SHALL** รองรับ version compatibility อย่างน้อย 1 major version ย้อนหลัง เช่น import จาก `eila_schema_version 1.x`
- **FR-IE-VALIDATE.9:** หาก import มาจาก version ที่สูงกว่าระบบรองรับ ระบบ **SHALL** reject พร้อม error ที่ระบุ version mismatch อย่างชัดเจน

### Acceptance Criteria

- import JSON ที่ field required ขาด ต้องถูก reject ก่อนเริ่ม save
- import JSON ที่มี `question_type` ผิด enum ต้อง return error ระบุ field ที่ผิด
- import JSON ที่ผิด 1 จุดใน question ลำดับกลางไฟล์ ต้องไม่เกิดข้อมูลบางส่วนใน DB
- import JSON จาก schema version เก่าที่รองรับ ต้องสำเร็จ

### Edge Cases & Constraints

- schema validation **SHOULD** แยกจาก business validation เพื่อให้ error report ชัดเจน
- frontend preview **SHALL** แสดงรายการ error ตาม `path` หรือ `question_index` ได้

---

## [64] FR-AUTH-SESSION — Session Timeout Policy

คำอธิบาย: แก้ไขและขยาย FR-AUTH01-04 จาก v1.8 ให้แยก idle timeout และ absolute timeout ชัดเจน

Assigned To: Both

### Requirement

- **FR-AUTH-SESSION.1:** ระบบ **SHALL** แยก session timeout ออกเป็น 2 แบบ:
  - `idle timeout`
  - `absolute timeout`
- **FR-AUTH-SESSION.2:** `idle timeout` **SHALL** เท่ากับ **30 นาที** นับจาก activity ล่าสุด
- **FR-AUTH-SESSION.3:** `absolute timeout` **SHALL** เท่ากับ **8 ชั่วโมง** นับจากเวลา login ไม่ว่าผู้ใช้จะ active หรือไม่
- **FR-AUTH-SESSION.4:** Frontend **SHALL** แสดง warning dialog ก่อนหมด `idle timeout` อย่างน้อย **5 นาที**
- **FR-AUTH-SESSION.5:** Frontend **SHALL** แสดงเวลานับถอยหลังใน warning dialog
- **FR-AUTH-SESSION.6:** เมื่อ session หมดอายุ ระบบ **SHALL** redirect ผู้ใช้ไปหน้า Login
- **FR-AUTH-SESSION.7:** หากผู้ใช้กำลังเปิด protected page อยู่และ session หมด ระบบ **SHALL** เก็บ return URL/state ไว้เพื่อ redirect กลับหลัง login สำเร็จ เว้นแต่ state นั้นมีข้อมูล sensitive เกิน policy
- **FR-AUTH-SESSION.8:** Activity ที่นับว่า active **SHALL** อย่างน้อยรวมถึง:
  - API call ที่ authenticated
  - keystroke บนหน้า application
  - mouse click
  - mouse move หรือ pointer move ที่ต่อเนื่องเกิน threshold ที่กำหนด
- **FR-AUTH-SESSION.9:** Frontend **SHOULD** throttle activity detection เพื่อไม่ให้ส่ง refresh/session ping ถี่เกินจำเป็น

### Acceptance Criteria

- ไม่มี activity 30 นาทีแล้ว session ต้องหมด
- active ต่อเนื่องเกิน 8 ชั่วโมงแล้ว session ต้องหมดแม้จะมี activity
- warning dialog ต้องแสดงก่อนหมดเวลา 5 นาที
- login ใหม่หลัง session หมดแล้วต้องกลับมายัง protected route เดิมได้ ถ้า policy อนุญาต

### Edge Cases & Constraints

- ถ้า network หลุดชั่วคราว Frontend **SHOULD** ไม่ตีความทันทีว่า session หมด จนกว่าจะ confirm จาก server
- ถ้า absolute timeout และ idle timeout ชนกัน ให้ยึด event ที่หมดก่อน

---

## [65] FR-TMPL-LIFECYCLE — Template Deprecation & Ownership

คำอธิบาย: เพิ่ม lifecycle ของ template เพื่อป้องกัน orphaned template และลดผลกระทบต่อ form ที่สร้างไปแล้ว

Assigned To: Both

### Requirement

- **FR-TMPL-LIFECYCLE.1:** เจ้าของ template และ `eila_admin` **SHALL** สามารถ mark template เป็น `deprecated` ได้
- **FR-TMPL-LIFECYCLE.2:** `faculty_admin` **SHALL** deprecate ได้เฉพาะ template ที่ตนเป็น owner หรืออยู่ใน faculty ของตน
- **FR-TMPL-LIFECYCLE.3:** เมื่อ template ถูก deprecate ระบบ **SHALL NOT** กระทบ form ที่ถูกสร้างจาก template นั้นไปแล้ว
- **FR-TMPL-LIFECYCLE.4:** เมื่อ template ถูก deprecate ระบบ **SHALL** แสดง label `Deprecated` ชัดเจนในทุกหน้าที่เลือกหรือดู template
- **FR-TMPL-LIFECYCLE.5:** ระบบ **SHALL** block การใช้ template deprecated สำหรับการสร้าง form ใหม่ เว้นแต่ eila_admin อนุญาต override ตาม policy
- **FR-TMPL-LIFECYCLE.6:** เมื่อ owner ของ template ถูก soft delete หรือพ้นสภาพการใช้งาน ระบบ **SHALL** โอน ownership ไปยัง:
  - `eila_admin` ถ้าเป็น global template
  - `faculty_admin` คนใหม่ใน faculty เดียวกัน หรือ fallback owner ที่ระบบกำหนด ถ้าเป็น faculty template
- **FR-TMPL-LIFECYCLE.7:** ระบบ **MAY** อนุญาต clone template ข้าม faculty ได้เฉพาะ `eila_admin` หรือ faculty_admin ที่มีสิทธิ์ explicit จาก policy
- **FR-TMPL-LIFECYCLE.8:** การอัปเดต template **SHALL** สร้าง template version ใหม่ และ **SHALL NOT** เปลี่ยน form ที่สร้างจาก template เดิมไปแล้ว

### Acceptance Criteria

- deprecate template แล้วต้องเห็น label `Deprecated` ใน UI
- form ที่สร้างจาก template เดิมต้องยังใช้งานได้ปกติหลัง template ถูก deprecate
- owner ถูก soft delete แล้ว template ต้องยังมี owner ใหม่ที่ตรวจสอบได้
- update template แล้ว form ที่ clone ไปก่อนหน้าไม่เปลี่ยนตาม

### Edge Cases & Constraints

- template ที่ไม่มี owner หลัง migration **SHALL** ถูก assign ให้ fallback owner ก่อน production go-live
- clone ข้าม faculty **SHALL** บันทึก audit log ทุกครั้ง

---

## [66] NFR-ACCESS — Accessibility Standard (WCAG 2.1 AA)

คำอธิบาย: เพิ่มมาตรฐาน accessibility ขั้นต่ำของระบบให้สอดคล้องกับ WCAG 2.1 AA

Assigned To: Frontend

### Requirement

- **NFR-ACCESS.1:** ระบบ **SHALL** ผ่านมาตรฐาน **WCAG 2.1 Level AA** เป็นอย่างน้อยสำหรับทุกหน้าที่อยู่ใน Phase 1 และ Phase 2
- **NFR-ACCESS.2:** Component ต่อไปนี้ **SHALL** accessible: form fields, buttons, modals, charts, drag-and-drop, notification panel
- **NFR-ACCESS.3:** ผู้ใช้ **SHALL** สามารถ navigate, fill, submit form, และใช้งาน dialog ได้ครบโดยไม่ใช้ mouse
- **NFR-ACCESS.4:** Dynamic content **SHALL** มี ARIA labels/roles ที่เหมาะสม และรองรับ screen reader
- **NFR-ACCESS.5:** Normal text **SHALL** มี color contrast ratio ไม่น้อยกว่า **4.5:1**
- **NFR-ACCESS.6:** Form builder drag-and-drop **SHALL** มี keyboard alternative สำหรับ reorder field เช่น move up/down action
- **NFR-ACCESS.7:** Validation error และ system alert **SHALL** ประกาศผ่าน `aria-live` region
- **NFR-ACCESS.8:** Charts และ data visualization **SHOULD** มี text summary หรือ accessible table view ควบคู่กัน

### Acceptance Criteria

- หน้า form submit ต้องใช้ keyboard-only flow ได้ครบ
- modal ทุกตัวต้อง trap focus และ close ได้ด้วย keyboard
- automated accessibility scan ต้องไม่เหลือ critical issue
- error message ต้องถูก screen reader อ่านออกเมื่อเกิด validation error

### Edge Cases & Constraints

- third-party chart/DnD library ที่ไม่ผ่าน accessibility **SHALL** ต้องมี wrapper หรือ fallback UI
- accessibility testing **SHOULD** ทำทั้ง automated และ manual

---

## [67] NFR-DR — Disaster Recovery & Backup Strategy

คำอธิบาย: แก้ไขและขยาย NFR-11 จาก v1.8 ให้เป็น disaster recovery strategy ที่วัดผลได้

Assigned To: DevOps

### Requirement

- **NFR-DR.1:** ระบบ **SHALL** มี **RTO (Recovery Time Objective)** ไม่เกิน **4 ชั่วโมง**
- **NFR-DR.2:** ระบบ **SHALL** มี **RPO (Recovery Point Objective)** ไม่เกิน **1 ชั่วโมง**
- **NFR-DR.3:** ระบบ **SHALL** ทำ backup ฐานข้อมูลอย่างน้อย **ทุก 6 ชั่วโมง**
- **NFR-DR.4:** ระบบ **SHALL** เก็บ backup daily snapshot ไม่น้อยกว่า **30 วัน**
- **NFR-DR.5:** ระบบ **SHALL** เก็บ backup ไว้อย่างน้อย 2 ตำแหน่ง:
  - on-site หรือ primary infrastructure storage
  - off-site หรือ cloud storage ที่แยก failure domain
- **NFR-DR.6:** ระบบ **SHALL** มี documented restore procedure ระบุขั้นตอน, owner, approval, และ verification checklist
- **NFR-DR.7:** ระบบ **SHALL** ทดสอบ restore อย่างน้อย **รายไตรมาส**
- **NFR-DR.8:** ระบบ **SHALL** มี health check endpoint `GET /health`
- **NFR-DR.9:** `GET /health` **SHALL** monitor อย่างน้อย:
  - application status
  - database connectivity
  - queue/scheduler status
  - disk/storage availability
  - latest backup freshness

### Acceptance Criteria

- ทดสอบ restore แล้วต้องกู้ระบบกลับมาได้ภายใน 4 ชั่วโมง
- backup ล่าสุดต้องไม่เก่าเกิน 6 ชั่วโมงในภาวะปกติ
- health endpoint ต้องแสดงสถานะ dependency หลักครบ
- มีเอกสาร DR runbook ที่ตรวจสอบและอ้างอิงได้

### Edge Cases & Constraints

- backup file **SHALL** ถูกเข้ารหัสทั้ง at rest และ in transit
- restore test **SHOULD** ทำใน isolated environment เพื่อไม่กระทบ production

---

## [68] FR-PH3 — Phase 3 Feature Scope

คำอธิบาย: สรุปขอบเขตฟีเจอร์ระดับ overview สำหรับ Phase 3 โดยยังไม่ลงรายละเอียดเชิง implementation

Assigned To: Both

### Requirement

- **FR-PH3.1:** ระบบ **MAY** รองรับ **Conditional Logic** สำหรับ form fields เช่น show/hide field ตามคำตอบก่อนหน้า
- **FR-PH3.2:** ระบบ **MAY** รองรับ **Advanced Analytics** เช่น เปรียบเทียบคะแนนระหว่าง faculty และดู historical trend
- **FR-PH3.3:** ระบบ **SHOULD** รองรับ **Mobile Responsive Optimization** ในระดับ PWA หรือ native-like experience หากผลวิจัยการใช้งานสนับสนุน
- **FR-PH3.4:** ระบบ **MAY** มี **Public API** สำหรับ integration กับระบบภายนอก PSU โดยต้องมี auth, rate limit, และ approval policy แยกต่างหาก
- **FR-PH3.5:** ระบบ **SHOULD** รองรับ **Multi-language Support** อย่างน้อยภาษาไทยและภาษาอังกฤษ
- **FR-PH3.6:** Feature ต่อไปนี้ **SHALL** ผ่าน research/additional discovery ก่อนเขียน detailed spec:
  - conditional logic complexity และ rule engine
  - cross-faculty analytics data governance
  - public API security model และ consumer onboarding
  - translation workflow และ content ownership

### Acceptance Criteria

- Phase 3 roadmap ต้องระบุ feature owner และ research prerequisite ครบทุก feature
- แต่ละ feature ใน Phase 3 ต้องมี discovery note หรือ feasibility assessment ก่อนเริ่ม implementation

### Edge Cases & Constraints

- Public API **SHALL NOT** เปิดใช้โดย default ใน Phase 1/2
- Multi-language support **SHOULD** ครอบคลุม UI labels, validation messages, email templates, และ exported report labels

---

## หมายเหตุการแก้ไขจาก v1.8

- แก้ไข/ขยายจาก v1.8:
  - FR-AUTH01-04 -> FR-AUTH-SESSION
  - NFR-11 -> NFR-DR
- requirement อื่นในเอกสารนี้เป็น **NEW patch** และไม่ยกเลิก requirement เดิมของ v1.8 เว้นแต่ระบุไว้ชัดเจน
