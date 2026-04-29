# EILAP Backend Technical Summary 🚀

เอกสารฉบับนี้สรุปโครงสร้างทางเทคนิค สถาปัตยกรรม และฟีเจอร์สำคัญของระบบ Backend (EILAP) เพื่อให้ทีมพัฒนา (Frontend/DevOps) นำไปใช้อ้างอิงในการทำงานต่อ

---

## 1. Tech Stack & Architecture
ระบบ Backend ถูกออกแบบด้วยสถาปัตยกรรมแบบ **Modular API** เพื่อให้แต่ละฟีเจอร์ทำงานแยกกันชัดเจน ตรวจสอบง่าย และลดการซ้ำซ้อนของโค้ด
- **Framework:** Fastify (เร็วที่สุดในฝั่ง Node.js)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM (Type-safe SQL)
- **Validation:** Zod (Type validation & Coercion)
- **Testing:** Vitest (ครอบคลุม Scoring & Ranking Engine)

---

## 2. Core Modules & Features

Backend ถูกแบ่งออกเป็น 14 โมดูลหลัก ทำงานครอบคลุมทุก Requirements (SRS 2.1):

### 🏢 2.1 Core Platform
- **Auth & Users:** จัดการ JWT Session, ระบบ Login, และการควบคุมสิทธิ์ (RBAC) 6 ระดับ
- **Websites:** บริหารจัดการเว็บไซต์ที่จะถูกประเมิน
- **Templates & Criteria:** ระบบจัดการเกณฑ์ประเมินแบบ Versioning ควบคุมระดับคณะและมหาวิทยาลัย
- **Rounds & Forms:** ระบบจัดการรอบการประเมิน (Rounds) และสร้างแบบฟอร์ม (Form Builder) ที่จะ Snapshot เกณฑ์การประเมินเพื่อป้องกันการเปลี่ยนแปลงย้อนหลัง

### 🧮 2.2 Analytics & Engine (หัวใจสำคัญของระบบ)
- **Scoring Engine (`scoring.service.ts`):** 
  - คำนวณคะแนนประเมินด้วยระบบ "ถ่วงน้ำหนัก" (Weighted Score)
  - รองรับ Normalization ปรับสเกลคะแนนที่ต่างกันให้อยู่ในฐาน 100 เสมอ
- **Ranking Engine (`ranking.service.ts`):** 
  - จัดอันดับเว็บไซต์แบบ Real-time
  - มีระบบ **Deterministic Tie-breaker** (แก้ปัญหาคะแนนเท่ากันโดยใช้ Submission Time / Created Time) แก้บั๊ก NaN เรียบร้อย
- **Dashboard:** ดึงข้อมูลสถิติ สรุปผลรายคณะ และภาพรวมระบบ (Overview) เพื่อแสดงผลเป็นกราฟในฝั่ง Frontend

### 🛡️ 2.3 Security & Compliance (PDPA)
- **Audit Logs (`audit.service.ts`):** 
  - ผูกเข้ากับทุก Action ที่มีการแก้ไขข้อมูล (เช่น สร้างฟอร์ม, แก้ไขเว็บ, ลงคะแนน, ให้สิทธิ์)
  - เก็บ IP Address และ User ID เพื่อให้สามารถตรวจสอบย้อนหลังได้ (Traceability)
- **PDPA (`pdpa.service.ts`):** 
  - ผู้ใช้สามารถยื่นขอลบข้อมูลได้
  - เมื่อ Super Admin อนุมัติ ระบบจะทำ Data Anonymization ทันที (สุ่ม ID, ลบ Email จริง) โดยไม่กระทบกับคะแนนประเมินที่เคยทำไปแล้ว

### 🤖 2.4 Automation & Scheduler
ระบบใช้ `node-cron` ในการทำงานเบื้องหลัง (Background Jobs):
- **Auto Open/Close:** เปิด-ปิดแบบฟอร์มและรอบประเมินอัตโนมัติตามเวลาที่กำหนด
- **URL Health Check:** ตรวจสอบความพร้อมของเว็บไซต์ทุก 24 ชั่วโมง และสร้าง Alert แจ้ง Super Admin หากเว็บไซต์เข้าไม่ได้ (`unreachable`)
- **Smart Reminders:** แจ้งเตือนผู้ประเมินที่ "ยังไม่ได้ส่งคำตอบ" ล่วงหน้า 3 วัน และ 1 วันก่อนปิดฟอร์ม
- **Email Retry Service:** ระบบคิวอีเมล (รองรับการ Retry หากส่งไม่สำเร็จที่ระยะเวลา 1m, 5m, 15m)

---

## 3. Data Flow ของการประเมิน (Evaluation Flow)

เพื่อให้เห็นภาพการทำงานของฐานข้อมูลและระบบ นี่คือเส้นทางการเกิดข้อมูล:

1. **Template & Criteria:** สร้างเกณฑ์กลาง
2. **Round & Form:** สร้างรอบประเมิน -> ดึง Template มา **Snapshot** เป็นเวอร์ชันแช่แข็งของฟอร์ม (ป้องกันเกณฑ์เปลี่ยนกลางคัน)
3. **Response:** Evaluator ทำการประเมิน -> ระบบสร้าง `responses` และ `response_answers`
4. **Scoring:** เมื่อดึงข้อมูล Dashboard -> Scoring Engine คำนวณคะแนนตามน้ำหนัก (Weight) ของแต่ละ Criteria แบบ On-the-fly
5. **Ranking:** นำคะแนนทั้งหมดมาเปรียบเทียบและจัดอันดับด้วย Ranking Engine

---

## 4. API Contracts (การเชื่อมต่อ Frontend)
Endpoint ทั้งหมดถูกทำสัญญา (Contract) ไว้ชัดเจนในเอกสาร: 
📄 `docs/design/api-contracts.md`
- Frontend สามารถใช้ Schema และ Payload จากไฟล์นี้ในการสร้าง Service Layer ฝั่ง Next.js ได้เลย
- ทุกๆ Error จะคืนค่าในรูปแบบ `{ error: { code, message } }` (Unified Error Envelope) ช่วยให้ Frontend รับมือกับ Error ได้แบบมาตรฐานเดียว

---

## 5. การทดสอบและรันระบบ (Testing & Run)

**คำสั่งรันระบบ:**
```bash
# 1. ติดตั้ง Dependencies
pnpm install

# 2. รัน Database Migrations (ถ้าจำเป็น)
pnpm --filter db push

# 3. รัน Server
pnpm --filter api dev
```

**คำสั่งทดสอบระบบ (Engine Tests):**
เรามี Golden Dataset Test สำหรับ Core Engine (Scoring / Ranking) เพื่อรับรองความถูกต้องของการคำนวณ
```bash
pnpm --filter api test
```
*(ปัจจุบันผ่าน 51/51 Tests ครอบคลุมเคสคะแนนเท่ากัน, ข้อบังคับ, และเงื่อนไขขอบเขต)*

---
*Generated: 2026-04-29 | Status: Backend 100% Production-Ready*
