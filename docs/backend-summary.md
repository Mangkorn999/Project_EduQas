# EILAP Backend Technical Summary 🚀

เอกสารฉบับนี้สรุปโครงสร้างทางเทคนิค และสถานะปัจจุบันของระบบ Backend (EILAP) เพื่อใช้เป็นแนวทางสำหรับทีม Frontend และการวางแผนขั้นต่อไป

**Status:** Backend Implementation Complete (Validated by Automated Tests)  
**Latest Update:** 2026-04-29

---

## 1. Tech Stack & Architecture
- **Framework:** Fastify (Modular API structure)
- **Language:** TypeScript
- **Database:** PostgreSQL (Managed via Drizzle ORM)
- **Validation:** Zod (Integrated with Fastify for type-safe requests)
- **Testing:** Vitest (Focused on calculation accuracy)

---

## 2. Module Overview & Implementation Details

### 🏢 2.1 Core Services
- **Auth (`oauth.handler.ts`):** จัดการสิทธิ์ (RBAC) 6 ระดับ และระบบ Role Override ผ่าน OTP
- **Forms (`forms.handler.ts`):** ระบบจัดการแบบฟอร์มประเมิน พร้อมระบบ Snapshot เกณฑ์การประเมินเพื่อความคงที่ของข้อมูล (Immutable snapshot on publish)
- **Websites (`websites.handler.ts`):** ระบบจัดการข้อมูลเว็บไซต์ที่รับการประเมิน

### 🧮 2.2 Calculation Engine
- **Scoring (`score.service.ts`):** ฟังก์ชันคำนวณคะแนนถ่วงน้ำหนัก (Weighted Score) พร้อมระบบ Normalization เพื่อปรับฐานคะแนนให้เป็นฐาน 100
- **Ranking (`ranking.service.ts`):** 
  - ระบบจัดอันดับเว็บไซต์แบบ Real-time
  - แก้ไขปัญหา **Non-deterministic Sorting (NaN)** ผ่านฟังก์ชัน `compareForRanking` โดยใช้เงื่อนไข Tie-breaker (ใช้เวลาส่งคำตอบ/เวลาสร้างฟอร์ม) เพื่อให้ผลลัพธ์การจัดอันดับออกมาคงที่เสมอ

### 🤖 2.3 Automation & Jobs (`scheduler.module.ts`)
ระบบใช้ `node-cron` ในการจัดการ Background Jobs โดยมีรอบเวลาดังนี้:
- **Round Lifecycle:** เช็คสถานะเปิด-ปิดรอบทุกต้นชั่วโมง (`0 * * * *`)
- **Smart Reminders:** ค้นหาผู้ประเมินที่ยังไม่ส่งคำตอบ และแจ้งเตือนล่วงหน้า 3 วัน / 1 วัน ทุกนาทีที่ 30 ของแต่ละชั่วโมง (`30 * * * *`)
- **URL Health Check:** ตรวจสอบ HTTP Status ของเว็บไซต์ทุกวัน เวลา 03:00 น. (`0 3 * * *`)
- **Email Retry Service:** ตรวจสอบคิวส่งเมลที่ล้มเหลวทุกนาที (`* * * * *`)

---

## 3. Constraints & Technical Notes

### 📧 Email Retry Policy (`retry.service.ts`)
- ระบบรองรับการ Retry สูงสุด 3 ครั้ง หากส่งไม่สำเร็จครั้งแรก
- **Intervals:** เว้นระยะการส่งซ้ำที่ 1 นาที, 5 นาที และ 15 นาที ตามลำดับ
- หลังจากพยายามครบ 4 ครั้ง (รวมครั้งแรก) สถานะจะค้างที่ `failed` เพื่อรอการตรวจสอบ

### 🛡️ Non-blocking Audit Logging (`audit.service.ts`)
- ฟังก์ชัน `createAuditLog` ถูกเรียกในระดับ Handler หลังจาก Action หลักทำงานสำเร็จ
- **Error Handling:** มีการทำ `try-catch` ภายในตัวมันเอง หากระบบ Log ล้มเหลว (เช่น DB ขัดข้องชั่วคราว) จะทำการ Log Error ไปที่ `stderr` เท่านั้น เพื่อไม่ให้ขัดขวาง (Block) การตอบกลับ response ของ User

### ✉️ Unified Error Envelope (`server.ts`)
- ระบบมีการตั้งค่า Global Error Handler ผ่าน `server.setErrorHandler`
- ทุก Endpoint จะคืนค่า Error ในรูปแบบมาตรฐานเดียวกัน:
  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Detailed message",
      "requestId": "uuid",
      "details": {}
    }
  }
  ```

---
*Generated: 2026-04-29 | Revision: 1.1 (Final Review Ready)*
