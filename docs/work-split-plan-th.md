# แผนแบ่งงานโครงการ EILA (ภาษาไทย)

อ้างอิงหลัก: `SRS2.1.md` และเอกสารใน `docs/design/*`

---

## 1) Backend/API Team

### ขอบเขตงาน
- พัฒนา `Auth + Session` ตาม `FR-AUTH-01..20`
- พัฒนา `Website / Round / Form / Response / Template` CRUD ตาม role/scope
- พัฒนา `Notification` รวม `FR-NOTIF-13` (resend จำกัด 1 ครั้ง/recipient/24 ชั่วโมง)
- พัฒนา `Ranking API` ตาม `FR-RANK-08..11` (threshold 30%, tie-break, eligibility status)
- ทำ error contract ตาม `NFR-API` (`code`, `message`, `requestId`, `details?`)

### ผลลัพธ์ (Deliverables)
- API ครบตาม `docs/design/api-contracts.md`
- Contract tests ผ่าน
- Collection/API examples ให้ทีม FE/QA ใช้งาน

---

## 2) Data/DB Team

### ขอบเขตงาน
- ออกแบบและสร้าง Drizzle schema + migrations ตาม `docs/design/db-schema.md`
- เพิ่ม constraints สำคัญ (scope, ownership, unique response ต่อ `form_id + user_id`)
- รองรับ ranking eligibility, notification log, audit hash chain
- รองรับ retention + anonymization ตาม `docs/design/data-lifecycle.md`

### ผลลัพธ์ (Deliverables)
- Migration ชุดแรก + seed สำคัญ (`FALLBACK_FACULTY_ID`, faculties, roles)
- เอกสารตรวจสอบ schema/index/constraint

---

## 3) Frontend Team

### ขอบเขตงาน
- พัฒนา route และ access guard ตาม `docs/design/component-tree.md`
- พัฒนา Form Builder + Evaluator flow (ต้องกดเปิดเว็บก่อน submit)
- พัฒนา Dashboard/Ranking UI พร้อมแสดงเหตุผล exclusion (`excluded_low_response`)
- รองรับ error handling จาก API (`requestId`, field errors)
- ทำ WCAG 2.1 AA baseline ตาม NFR-ACCESS

### ผลลัพธ์ (Deliverables)
- หน้าหลัก Phase 1 ใช้งานได้ครบ
- โครงหน้า Phase 2 พร้อมต่อ API จริง

---

## 4) Scheduler/DevOps Team

### ขอบเขตงาน
- ตั้ง cron jobs: URL validate, reminder, auto-open/close, retry mail, lifecycle jobs
- ทำ observability ตาม `NFR-OBS` (p95/p99, error rate, queue, scheduler lag, DB pool)
- ตั้ง alert rules: 5xx spike, queue backlog, scheduler failure, backup failure
- จัดทำ backup/restore ตาม `NFR-AVAIL` (RTO/RPO)

### ผลลัพธ์ (Deliverables)
- Dashboard monitoring + alert channels
- Runbook incident/DR + health/readiness checks

---

## 5) QA/Test Team

### ขอบเขตงาน
- จัดทำ test matrix จาก `SRS2.1.md` และ `Appendix H`
- ทดสอบกรณีเสี่ยงสำคัญ:
  - auth/session timeout/refresh reuse
  - ranking threshold/tie-break determinism
  - resend policy 24 ชั่วโมง
  - PDPA/anonymization/audit chain verification
- ทำ regression suite แยก Phase 1 / Phase 2

### ผลลัพธ์ (Deliverables)
- Test cases + automated suites + UAT checklist
- Requirement trace report

---

## Dependency Order (ลำดับเริ่มงาน)
1. Data/DB
2. Backend/API (ทำคู่กับ DevOps setup ได้)
3. Frontend (เริ่ม mock แล้วต่อ API จริง)
4. QA automation + end-to-end
5. UAT + hardening

---

## Sprint Plan (แนะนำ)

### Sprint 1 (P1 Core)
- Auth, Website, Round, Form, Response, DB base, basic UI

### Sprint 2 (P1 Complete)
- Notification, Import/Export, Audit/PDPA, observability baseline

### Sprint 3 (P2 Analytics)
- Ranking, Scorecard, PDF/Email status, heatmap/trend

### Sprint 4 (Stabilize)
- Performance/Security/Accessibility/DR drills + regression

---

## Definition of Done (ทีมรวม)
- งานผ่าน acceptance criteria ตาม `SRS2.1.md`
- มี test evidence (unit/integration/e2e ตามความเหมาะสม)
- ไม่มีช่องโหว่ critical ที่ยังไม่ปิด
- เอกสาร design/contract/update ครบและสอดคล้องกัน
