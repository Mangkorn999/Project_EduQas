# แผนแบ่งงานโครงการ EILA (ภาษาไทย, AI-executable)

อ้างอิงหลัก: `SRS2.1.md` และเอกสารใน `docs/design/*`

## วิธีใช้เอกสารนี้กับ AI
- AI ต้องทำงานเป็น Task ID เท่านั้น (ห้ามข้ามลำดับ dependency)
- ทุก Task ต้องมีหลักฐานผลลัพธ์ตาม Output และ Done Criteria
- ถ้า task ไหนติด dependency ให้หยุดและรายงาน blocker

---

## สถานะงาน
- `todo`: ยังไม่เริ่ม
- `in_progress`: กำลังทำ
- `blocked`: ติด dependency หรือข้อมูลไม่พอ
- `done`: ผ่าน Done Criteria ครบ

---

## Task Graph (ลำดับบังคับ)
`DB-*` -> `BE-*` -> `FE-*` -> `QA-*`  
`DEVOPS-*` เริ่มคู่กับ `BE-*` ได้ และต้องเสร็จก่อน `QA-E2E-01`

---

## Data/DB Tasks

### DB-SCH-01
- Owner: Data/DB
- Status: `todo`
- Input: `docs/design/db-schema.md`, `SRS2.1.md` (FR-DATA, FR-AUDIT, FR-RESP)
- Output: Drizzle schema ครบ domain หลัก + migration ชุดแรก
- Depends on: -
- Done Criteria:
  - ตารางหลักสร้างได้ครบและผ่าน migrate
  - enum/constraint สำคัญครบ (scope, status, role)
  - เอกสารสรุป schema เปรียบเทียบกับ SRS แล้วไม่ตกหล่น

### DB-SCH-02
- Owner: Data/DB
- Status: `todo`
- Input: ผลจาก `DB-SCH-01`
- Output: constraints เพิ่มเติม (`form_id + user_id` unique, ownership/scope checks)
- Depends on: `DB-SCH-01`
- Done Criteria:
  - ทดสอบ insert/update ผิดเงื่อนไขแล้วถูก reject
  - มี SQL/ORM test case ยืนยันอย่างน้อย 1 เคสต่อ constraint สำคัญ

### DB-LIFE-01
- Owner: Data/DB
- Status: `todo`
- Input: `docs/design/data-lifecycle.md`
- Output: โครง retention/anonymization/audit chain ที่ runnable
- Depends on: `DB-SCH-01`
- Done Criteria:
  - มี script/job prototype สำหรับ anonymize + archive audit
  - มีวิธี verify hash chain ตามที่ design ระบุ

---

## Backend/API Tasks

### BE-AUTH-01
- Owner: Backend/API
- Status: `todo`
- Input: `docs/design/auth-flow.md`, `SRS2.1.md` FR-AUTH-01..20
- Output: auth endpoints + refresh rotation + reuse detection + revoke-all
- Depends on: `DB-SCH-01`
- Done Criteria:
  - flow login/refresh/logout/revoke-all ทำงานครบ
  - reuse token แล้ว revoke ทุก session ได้จริง
  - มี integration test หลักครบ

### BE-CORE-01
- Owner: Backend/API
- Status: `todo`
- Input: `docs/design/api-contracts.md`, `SRS2.1.md` FR-WEB/FR-ROUND/FR-FORM/FR-RESP/FR-TMPL
- Output: CRUD/domain endpoints หลักครบตาม contract
- Depends on: `DB-SCH-01`, `DB-SCH-02`
- Done Criteria:
  - ผ่าน role/scope authorization tests
  - form-response flow ใช้งาน end-to-end ได้

### BE-NOTIF-01
- Owner: Backend/API
- Status: `todo`
- Input: `SRS2.1.md` FR-NOTIF-01..13
- Output: notification + resend policy (1 ครั้ง/recipient/24 ชั่วโมง)
- Depends on: `DB-SCH-01`, `BE-CORE-01`
- Done Criteria:
  - resend เกิน policy แล้วถูก reject พร้อม error code ชัดเจน
  - ทุก resend มี audit event

### BE-RANK-01
- Owner: Backend/API
- Status: `todo`
- Input: `docs/design/scoring-and-ranking.md`, `SRS2.1.md` FR-RANK-08..11
- Output: ranking endpoints รองรับ threshold 30%, tie-break, eligibility
- Depends on: `BE-CORE-01`
- Done Criteria:
  - responseRate < 30% -> `excluded_low_response`
  - tie-break deterministic ตามลำดับที่กำหนด
  - มี test data case ยืนยัน ranking ซ้ำแล้วผลเท่าเดิม

### BE-API-STD-01
- Owner: Backend/API
- Status: `todo`
- Input: `SRS2.1.md` NFR-API
- Output: error envelope มาตรฐาน `{code,message,requestId,details?}`
- Depends on: `BE-CORE-01`
- Done Criteria:
  - endpoint หลักคืน error รูปแบบเดียวกัน
  - `requestId` มีในทุก non-2xx response

---

## Frontend Tasks

### FE-ROUTE-01
- Owner: Frontend
- Status: `todo`
- Input: `docs/design/component-tree.md`
- Output: route structure + role guards พื้นฐาน
- Depends on: `BE-AUTH-01`
- Done Criteria:
  - role เข้าได้เฉพาะหน้าอนุญาต
  - unauthorized ถูก redirect/deny ถูกต้อง

### FE-FORM-01
- Owner: Frontend
- Status: `todo`
- Input: `SRS2.1.md` FR-FORM/FR-EVAL/FR-RESP
- Output: Form Builder + Evaluator flow พร้อม soft gate
- Depends on: `BE-CORE-01`
- Done Criteria:
  - ไม่กดเปิดเว็บไซต์แล้ว submit ไม่ได้
  - autosave/edit จนก่อนปิดฟอร์มทำงานได้

### FE-DASH-01
- Owner: Frontend
- Status: `todo`
- Input: `SRS2.1.md` FR-DASH/FR-RANK
- Output: dashboard/ranking UI + exclusion reason
- Depends on: `BE-RANK-01`
- Done Criteria:
  - แสดง `excluded_low_response` ชัดเจน
  - filter หลักทำงานร่วมกันได้

### FE-ERR-01
- Owner: Frontend
- Status: `todo`
- Input: output จาก `BE-API-STD-01`
- Output: error handling กลาง (requestId, field errors)
- Depends on: `BE-API-STD-01`
- Done Criteria:
  - แสดง validation error ราย field ได้
  - แสดง requestId ใน error toast/panel สำหรับ trace

---

## DevOps/Scheduler Tasks

### DEVOPS-CRON-01
- Owner: DevOps
- Status: `todo`
- Input: `docs/design/deployment.md`
- Output: cron jobs สำคัญ (validate URL, reminder, open/close, retry, lifecycle)
- Depends on: `BE-CORE-01`, `BE-NOTIF-01`
- Done Criteria:
  - schedule ทำงานตามเวลาและมี log ตรวจสอบได้
  - job fail แล้วมี retry/alert ตาม policy

### DEVOPS-OBS-01
- Owner: DevOps
- Status: `todo`
- Input: `SRS2.1.md` NFR-OBS
- Output: metrics dashboard + alerts (5xx, queue, scheduler, backup)
- Depends on: `BE-CORE-01`
- Done Criteria:
  - เห็น p95/p99, error rate, queue, DB pool, scheduler lag ครบ
  - ทดสอบ alert แล้วยิงแจ้งเตือนจริง

### DEVOPS-DR-01
- Owner: DevOps
- Status: `todo`
- Input: `SRS2.1.md` NFR-AVAIL
- Output: backup/restore runbook + drill evidence
- Depends on: `DB-SCH-01`
- Done Criteria:
  - มีผลทดสอบ restore
  - มีเอกสารยืนยัน RTO/RPO ตามเกณฑ์

---

## QA/Test Tasks

### QA-MTX-01
- Owner: QA
- Status: `todo`
- Input: `SRS2.1.md`, `Appendix H`, output จากทุกทีม
- Output: requirement-to-test matrix
- Depends on: `BE-CORE-01`, `FE-ROUTE-01`
- Done Criteria:
  - FR/NFR สำคัญถูก map กับ test case ครบ
  - ระบุ owner/frequency ของ regression ชัดเจน

### QA-CRIT-01
- Owner: QA
- Status: `todo`
- Input: ผลจาก `BE-AUTH-01`, `BE-RANK-01`, `BE-NOTIF-01`, `DB-LIFE-01`
- Output: critical scenario tests (auth/reuse, ranking determinism, resend policy, PDPA/audit)
- Depends on: `QA-MTX-01`
- Done Criteria:
  - ทุก critical path ผ่าน
  - defect ระดับ critical = 0 ก่อน UAT

### QA-E2E-01
- Owner: QA
- Status: `todo`
- Input: ระบบรวมทุกส่วน
- Output: end-to-end report + UAT checklist
- Depends on: `FE-DASH-01`, `DEVOPS-CRON-01`, `DEVOPS-OBS-01`
- Done Criteria:
  - flow หลักตั้งแต่ login -> evaluation -> dashboard/ranking ผ่าน
  - มีหลักฐานผลทดสอบและ known issues list

---

## Sprint Mapping (แนะนำ)
- Sprint 1: `DB-SCH-*`, `BE-AUTH-01`, `BE-CORE-01`, `FE-ROUTE-01`, `FE-FORM-01`
- Sprint 2: `BE-NOTIF-01`, `BE-API-STD-01`, `DEVOPS-CRON-01`, `DEVOPS-OBS-01`, `QA-MTX-01`
- Sprint 3: `BE-RANK-01`, `FE-DASH-01`, `FE-ERR-01`, `QA-CRIT-01`
- Sprint 4: `DB-LIFE-01`, `DEVOPS-DR-01`, `QA-E2E-01`, hardening

---

## Definition of Done (ภาพรวม)
- ผ่าน acceptance criteria ตาม `SRS2.1.md`
- มีหลักฐาน test (unit/integration/e2e) ตามระดับงาน
- ไม่มีช่องโหว่ critical ค้าง
- เอกสาร (`SRS2.1`, `docs/design`, API contract, task status) สอดคล้องกัน
