# eila — Software Requirements Specification (SRS)

> ระบบประเมินเว็บไซต์มหาวิทยาลัย / Web Evaluation System
> Prince of Songkla University
> **Version 1.8 | Updated: 2026-04-24**
> **SRS Changelog from v1.7.1:** เพิ่ม 3 ข้อ: URL validation, Reminder idempotency, Audit log purge

---

## Changelog

| Version | วันที่ | สิ่งที่เปลี่ยน |
|---------|--------|--------------|
| 1.0 | 2026-04-23 | Initial SRS |
| 1.1 | 2026-04-23 | เพิ่ม Faculty Structure, Form-first Concept, Import/Export, แก้ DB Schema, ยืนยัน Status Flow |
| 1.2 | 2026-04-23 | เพิ่ม faculties table, Form Scope, Form Date Auto-close, Notification System |
| 1.3 | 2026-04-23 | เพิ่ม Git Branch Strategy (หัวข้อ 11) |
| 1.4 | 2026-04-23 | Template Scope, eila_admin แยก Path, UNIQUE Constraint, University Scope Logic, Hotfix Branch |
| 1.5 | 2026-04-23 | แก้ไข 42 ข้อจาก SRS Review: Security 14 ข้อ, Missing 10 ข้อ, Ambiguous 8 ข้อ, Untestable 7 ข้อ, Conflicting 3 ข้อ |
| 1.6 | 2026-04-24 | แก้ไข 5 ข้อจาก Final Sanity Check: FR-U06 (2FA→Email OTP), NFR-SEC11 (Key Management), ลบ Section 15.7 ซ้ำ, NFR-14 (Infrastructure note), audit_logs (prev_hash + hash) |
| **1.7.1** | **2026-04-24** | **แก้ไข 8 ข้อจาก Spec Review: FR-AUTH05 (Faculty fallback definitive), FR-D05 (university scope formula), FR-U01+FR-U07 (Bulk XLSX spec+API), FR-N02/N03 (university scope recipients), Section 15 Phase labels, Notification API endpoints, /rollback naming, node-cron confirmed** |
| **1.8** | **2026-04-24** | **เพิ่ม 3 ข้อ: FR-F19/F20/F21 (URL validation), FR-N11 (Reminder idempotency), FR-U08 (Audit log purge scheduler)** |

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์
eila คือระบบเว็บสำหรับประเมินเว็บไซต์ของมหาวิทยาลัย โดย Admin สามารถสร้างแบบประเมินแบบ Drag & Drop คล้าย Google Forms กำหนด Role และขอบเขต (Faculty / University) ที่รับฟอร์ม ตั้งเวลาเปิด-ปิดอัตโนมัติ Import/Export ฟอร์มได้ และดูผลลัพธ์ผ่าน Dashboard ผู้ใช้ทุกคน Login ผ่าน PSU Passport และระบบแยก Role อัตโนมัติ

### 1.2 ขอบเขตของระบบ (Scope)
- สร้างและจัดการแบบประเมิน (Form) แบบ Form-first คล้าย Google Forms
- ระบบ Authentication ผ่าน PSU Passport (OAuth)
- กำหนดสิทธิ์การเข้าถึงตาม Role และ Faculty อย่างเข้มงวด
- Form Scope: `faculty` (เฉพาะคณะ) และ `university` (ทุก Role ทุก Faculty เห็น)
- Template Scope: `faculty` (เฉพาะคณะตัวเอง) และ `global` (eila_admin สร้างให้ทุกคณะใช้)
- ตั้งเวลาเปิด-ปิดฟอร์มอัตโนมัติ พร้อมแก้ไขได้
- Import/Export โครงสร้างฟอร์ม (.json) และผลลัพธ์ (.pdf / .xlsx)
- แสดงผลลัพธ์ผ่าน Dashboard แยกตาม Faculty
- ระบบแจ้งเตือนผ่าน Email + In-app

### 1.3 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Fastify + Node.js |
| Database | PostgreSQL |
| Authentication | PSU Passport (OAuth 2.0 + PKCE) |
| Form Drag & Drop | dnd-kit |
| Export Results | PDF-lib + ExcelJS |
| Export/Import Structure | JSON |
| Scheduler (Auto-close) | **node-cron** ✅ (confirmed — Node.js native, ไม่ต้องการ PostgreSQL extension) |
| Email Notification | Nodemailer / SMTP PSU |
| Deploy | TBD |

---

## 2. ผู้ใช้งาน (User Roles)

ระบบมีทั้งหมด **6 Role**

| Role | สร้างฟอร์ม | ตอบฟอร์ม | ดู Dashboard | จัดการ Admin | ขอบเขตข้อมูล |
|---|:---:|:---:|:---:|:---:|---|
| eila_admin | ✅ | ❌ | ✅ | ✅ | ทุก Faculty |
| faculty_admin | ✅ | ❌ | ✅ | ❌ | แค่ Faculty ตัวเอง |
| executive | ❌ | ❌ | ✅ | ❌ | ทุก Faculty |
| teacher | ❌ | ✅ | ❌ | ❌ | เฉพาะฟอร์มที่ได้รับ |
| staff | ❌ | ✅ | ❌ | ❌ | เฉพาะฟอร์มที่ได้รับ |
| student | ❌ | ✅ | ❌ | ❌ | เฉพาะฟอร์มที่ได้รับ |

### 2.1 eila_admin
- Admin หลักของระบบ EILA ทั้งหมด
- จัดการ faculty_admin ได้ (เพิ่ม / ลบ / แก้ไข)
- จัดการ Faculty ในระบบได้ (เพิ่ม / ลบ / แก้ไข ผ่าน `faculties` table)
- จัดการผู้ใช้ทุก Role รวมถึง executive
- สร้างฟอร์มได้ทั้ง `faculty` scope และ `university` scope ผ่าน Path `/eila-admin/forms/*`
- สร้าง Template ได้ทั้ง `faculty` scope และ `global` scope
- ดู Dashboard และ Export ได้ทุก Faculty
- มีได้ 1–2 คนเท่านั้น
- `faculty_id = NULL` (ไม่ผูกกับ Faculty ใด)
- ต้อง configure `FALLBACK_FACULTY_ID` ใน environment ก่อน deploy

### 2.2 faculty_admin
- Admin ประจำแต่ละ Faculty
- สร้างได้เฉพาะฟอร์ม `faculty` scope ของตัวเองเท่านั้น (ไม่สร้าง `university` scope)
- เห็นและจัดการได้เฉพาะฟอร์ม / Template ของ Faculty ตัวเองเท่านั้น
- ไม่เห็นฟอร์ม / Template ของ Faculty อื่น นอกจาก Import เข้ามาเอง
- Import / Export ฟอร์ม (.json) ได้
- Export ผลลัพธ์ (.pdf / .xlsx) ได้
- มีได้หลายคนต่อ Faculty

### 2.3 executive
- ดู Dashboard ได้ทุกฟอร์มทุก Faculty
- Export PDF และ Excel ได้
- ไม่ตอบฟอร์ม (เพื่อความถูกต้องของข้อมูล)
- กำหนดโดย eila_admin เท่านั้น

### 2.4 teacher / staff / student (Respondent)
- Login ผ่าน PSU Passport → ระบบรับ Role + Faculty อัตโนมัติ
- Auto-create ลงใน `users` table ครั้งแรกที่ Login
- เห็นฟอร์มที่ถูกกำหนดให้ Role และ Faculty ตัวเอง **รวมถึงฟอร์ม `university` scope ทุกชิ้น**
- แก้ไขคำตอบได้จนกว่าฟอร์มจะ `closed`
- ไม่เห็นคำตอบของคนอื่น

---

## 3. Authentication

### 3.1 PSU Passport (OAuth 2.0 + PKCE)
- ไม่มีระบบ Register หรือจัดการรหัสผ่านเอง
- ผู้ใช้ทุกคน Login ผ่าน PSU Passport
- PSU Passport ส่ง Role + Faculty มาให้อัตโนมัติ
- **NFR-SEC10: Implement PKCE for OAuth, validate state parameter, verify JWT signature**

รหัสนักศึกษา  →  student  + faculty จาก PSU Passport
รหัสอาจารย์    →  teacher  + faculty จาก PSU Passport
รหัสบุคลากร    →  staff    + faculty จาก PSU Passport
กำหนดโดย eila_admin  →  executive / faculty_admin / eila_admin
### 3.2 Role Resolution Flow

PSU Passport Login
↓
ดึง psu_passport_id + role + faculty จาก PSU
↓
เช็ค users table ว่ามีการ Override role ไหม?
├── มี Override → ใช้ role จาก DB (executive / faculty_admin / eila_admin)
└── ไม่มี → Auto-create / Update ข้อมูลจาก PSU
(role: student / teacher / staff, faculty จาก PSU)
### 3.3 Session Management

**FR-AUTH01: Session Timeout**
- User session หมดอายุหลังจากไม่มีการใช้งาน 30 นาที
- ระบบแสดง countdown 5 นาทีก่อน session หมดอายุ
- User สามารถ refresh session ได้ก่อนหมดอายุ

**FR-AUTH02: Logout**
- User สามารถ Logout ได้ทุกเมื่อ
- เมื่อ Logout ระบบจะลบ session token ทั้งหมด
- Logout มี 2 แบบ:
  - **Logout ปกติ:** กลับไปหน้า Landing Page
  - **Logout ทุกอุปกรณ์:** ลบ session ทั้งหมด (สำหรับกรณีฉุกเฉิน)

**FR-AUTH03: Session Storage**
- Session token เก็บใน HttpOnly Cookie
- Cookie มี Secure flag + SameSite=Strict
- Token มีอายุสูงสุด 30 นาที

### 3.4 Token Refresh Strategy

**FR-AUTH04: Token Expiry Handling**
- PSU Passport Access Token มีอายุ 30 นาที
- ระบบใช้ Refresh Token เพื่อขอ Access Token ใหม่ (ถ้า PSU รองรับ)
- ถ้าไม่มี Refresh Token → ให้ user Login ใหม่
- ถ้า Token หมดอายุระหว่างใช้งาน → บันทึก state ไว้ และ redirect ไป Login

### 3.5 PSU Passport Fallback ✏️ (Updated v1.7.1)

**FR-AUTH05: PSU Passport Fallback — Definitive Rules**

**กรณี PSU ไม่ส่ง `faculty_id`:**
1. ระบบ assign `faculty_id = FALLBACK_FACULTY_ID` ซึ่ง configure ไว้ใน environment variable
2. `FALLBACK_FACULTY_ID` ต้องเป็น UUID ของ Faculty "PSU General" ที่ eila_admin สร้างไว้ใน `faculties` table ก่อน deploy
3. User ที่ถูก assign FALLBACK_FACULTY_ID จะเห็นเฉพาะฟอร์ม `university` scope เท่านั้น จนกว่า eila_admin จะ assign `faculty_id` ที่ถูกต้อง
4. บันทึก error ลง audit log: `{ action: 'FALLBACK_FACULTY_ASSIGNED', entity_type: 'USER', psu_passport_id, reason: 'PSU did not provide faculty_id' }`
5. **ไม่มี UI ให้ user เลือก Faculty เอง** — ทั้งหมด handle อัตโนมัติ

**กรณี PSU ไม่ส่ง `role`:**
1. Default เป็น `'student'`
2. บันทึก error ลง audit log

**Setup requirement:**
.env (production)FALLBACK_FACULTY_ID=<UUID ของ Faculty "PSU General" ใน faculties table>
---

## 4. Functional Requirements

### 4.1 Form Builder (Form-first แบบ Google Forms)

- **FR-F01** Admin สร้างฟอร์มใหม่แบบเปล่าได้ โดยไม่ต้องมี Template
- **FR-F02** รองรับการ Drag & Drop เพื่อเรียงลำดับคำถาม
- **FR-F03** สามารถเพิ่ม / ลบ / แก้ไขคำถามใน Form ได้
- **FR-F04** สามารถกำหนด URL เว็บไซต์ที่ต้องการประเมินได้
- **FR-F19** ระบบ validate website_url ต้องเป็น valid URL format (http:// หรือ https://)
- **FR-F20** ระบบตรวจสอบ website_url ว่า reachable ได้ (HTTP HEAD request, timeout 5 วินาที)
- **FR-F21** ระบบเตือน Admin ก่อน publish หาก URL ไม่สามารถเชื่อมต่อได้
- **FR-F05** สามารถกำหนด Role ที่จะรับฟอร์มได้ (เลือกได้หลาย Role) เฉพาะ `faculty` scope
- **FR-F06** สามารถเปิด / ปิดฟอร์มได้ตลอดเวลา
- **FR-F07** ฟอร์มมีสถานะ 3 สถานะ ได้แก่ `draft` / `open` / `closed`
- **FR-F08** สามารถ Copy ฟอร์มเก่าไปสร้างใหม่และแก้ไขได้

#### Form Scope

- **FR-F09** ฟอร์มมี Scope 2 แบบ

| Scope | สร้างโดย | ใครเห็น | target_roles |
|-------|---------|--------|-------------|
| `faculty` | faculty_admin หรือ eila_admin | เฉพาะ Role ที่กำหนดใน Faculty นั้น | ✅ ใช้ |
| `university` | eila_admin เท่านั้น | ทุก Role ทุก Faculty ทั้งหมด | ❌ ไม่ใช้ (เห็นหมดเลย) |

- **FR-F10** faculty_admin สร้างได้เฉพาะ `faculty` scope
- **FR-F11** eila_admin สร้างได้ทั้ง `faculty` และ `university` scope
- **FR-F12** ฟอร์ม `university` scope ไม่มี `form_target_roles`

**Form Visibility Logic (Pseudocode):**

```typescript
function canUserSeeForm(user: User, form: Form): boolean {
  if (user.role === 'eila_admin') return true
  if (user.role === 'executive') return true
  if (form.scope === 'university') return true
  if (form.scope === 'faculty') {
    if (user.role === 'faculty_admin' && user.faculty_id === form.faculty_id) return true
    if (user.faculty_id === form.faculty_id) {
      const targetRoles = getFormTargetRoles(form.id)
      return targetRoles.includes(user.role)
    }
    return false
  }
  return false
}
```

#### Form Date (Auto-close)

- **FR-F13** Admin สามารถกำหนด `open_at` และ `close_at` ล่วงหน้าได้
- **FR-F14** ระบบเปลี่ยน Status เป็น `open` อัตโนมัติเมื่อถึงเวลา `open_at`
- **FR-F15** ระบบเปลี่ยน Status เป็น `closed` อัตโนมัติเมื่อถึงเวลา `close_at`
- **FR-F16** Admin สามารถแก้ไข `close_at` เพื่อขยายเวลาได้ แม้ฟอร์มจะ `open` หรือ `closed` แล้ว
- **FR-F17** `open_at` และ `close_at` เป็น Optional ถ้าไม่กำหนด Admin ต้องเปิด/ปิดเอง

**Status Flow**

```text
draft ⇄ open → closed
↑      |
└──────┘ (เปิดใหม่ได้)
```

- `draft  -> open` กดเอง หรือระบบเปิดอัตโนมัติตาม `open_at`
- `open   -> draft` ดึงกลับมาแก้ไข
- `open   -> closed` กดเอง หรือระบบปิดอัตโนมัติตาม `close_at`
- `closed -> open` เปิดรอบใหม่ หรือขยายเวลา
- ถ้าฟอร์ม `closed` Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
- `closed -> open` ใหม่: ไม่ลบ responses เก่า และ Respondent สามารถ Upsert response เดิมได้

#### Concurrent Form Editing

**FR-F18: Optimistic Locking**

- ฟอร์มทุกฟอร์มมี `version` field (integer, เริ่มที่ 1)
- ตอนบันทึก ระบบต้องตรวจสอบว่า `version` ใน DB ตรงกับ client หรือไม่
- ถ้าตรงกัน บันทึกสำเร็จและเพิ่ม `version` ขึ้น 1
- ถ้าไม่ตรงกัน แสดง warning + diff และให้เลือก Overwrite หรือ Cancel

### 4.2 Template System

- **FR-T01** Admin สร้าง Template ชุดคำถามสำเร็จรูปได้
- **FR-T02** Template มี Scope 2 แบบ

| Scope | สร้างโดย | ใครเห็น |
|---|---|---|
| `faculty` | faculty_admin หรือ eila_admin | เฉพาะ Faculty ตัวเอง |
| `global` | eila_admin เท่านั้น | ทุก Faculty ใช้ได้ |

- **FR-T03** faculty_admin เห็นเฉพาะ `scope='global'` หรือ (`scope='faculty'` และ `faculty_id = user.faculty_id`)
- **FR-T04** แชร์ Template ระหว่าง Faculty ต้องทำผ่าน Export JSON -> Import เท่านั้น
- **FR-T05** เมื่อ Admin เลือก Template มาสร้างฟอร์ม ระบบ Clone คำถามทั้งหมดเข้า `form_questions` ทันที
- **FR-T06** คำถามที่ Clone มาสามารถแก้ไขได้อิสระ ไม่กระทบ Template ต้นฉบับ
- **FR-T07** Admin สามารถแก้ไข / ลบ Template ของตัวเองได้

### 4.3 ประเภทคำถาม (Question Types)

- **FR-Q01** Rating Scale (1-5 ดาว)
- **FR-Q02** Short Text (ข้อความสั้น / ความคิดเห็น)
- **FR-Q03** สามารถกำหนดได้ว่าคำถามข้อนั้นบังคับตอบหรือไม่
- **FR-Q04** สามารถเรียงลำดับคำถามได้อิสระด้วย Drag & Drop

### 4.4 Import / Export

#### Export โครงสร้างฟอร์ม

- **FR-IE01** Admin Export โครงสร้างฟอร์มออกเป็น `.json` ได้
- **FR-IE02** ไฟล์ `.json` มีเฉพาะโครงสร้างคำถาม ไม่มีคำตอบของ User
- **FR-IE03** โครงสร้าง JSON มาตรฐาน ดูที่หัวข้อ 8

#### Import ฟอร์ม

- **FR-IE04** Admin Import ไฟล์ `.json` เพื่อนำคำถามเข้าฟอร์มได้
- **FR-IE05** ระบบ Preview รายการคำถามที่จะ Import ให้ Admin ยืนยันก่อนเสมอ
- **FR-IE06** หากฟอร์มมีคำถามอยู่แล้ว ระบบถามว่า "เพิ่มต่อท้าย" หรือ "แทนที่ทั้งหมด"
- **FR-IE07** รองรับไฟล์ `.json` จากระบบอื่นหาก Format ถูกต้องตาม Validation Rules ในหัวข้อ 8.2
- **FR-IE08** หาก Format ผิด ระบบแจ้ง Error พร้อมระบุว่าผิดตรงไหน
- **FR-IE09** คำถามที่ Import มาแล้วสามารถแก้ไข / ลบ / เรียงลำดับใหม่ได้อิสระ

#### Export ผลลัพธ์

- **FR-IE10** Admin และ Executive Export ผลลัพธ์เป็น `.pdf` ได้
- **FR-IE11** Admin และ Executive Export ผลลัพธ์เป็น `.xlsx` ได้

### 4.5 การตอบฟอร์ม (Response)

- **FR-R01** Respondent เห็นฟอร์มหาก `form.scope = 'university'` หรือ (`form.scope = 'faculty'` และ `form.faculty_id = user.faculty_id` และ `user.role IN form_target_roles`)
- **FR-R02** แสดงสถานะฟอร์ม: ยังไม่ตอบ / ตอบแล้ว / หมดเวลาแล้ว
- **FR-R03** Respondent แก้ไขคำตอบได้จนกว่าฟอร์มจะ `closed`
- **FR-R04** เมื่อฟอร์ม `closed` Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
- **FR-R05** ระบบเก็บเฉพาะคำตอบล่าสุด (Upsert) โดย `UPDATE` ถ้ามี และ `INSERT` ถ้ายังไม่มี
- **FR-R06** Respondent ไม่สามารถเห็นคำตอบของคนอื่นได้
- **FR-R07** มี `UNIQUE (form_id, user_id)` ใน `responses` table เพื่อป้องกันส่งซ้ำ

### 4.6 Dashboard & Analytics

- **FR-D01** faculty_admin ดูผลลัพธ์ได้เฉพาะฟอร์มใน Faculty ตัวเอง
- **FR-D02** eila_admin และ executive ดู Dashboard ได้ทุกฟอร์มทุก Faculty
- **FR-D03** แสดงคะแนนเฉลี่ยของแต่ละคำถาม
- **FR-D04** แสดงกราฟสรุปผลภาพรวม (Bar Chart sorted by count desc, max 20 bars / Short text max 100 comments sorted by recency)
- **FR-D05** แสดงจำนวนผู้ตอบทั้งหมด และ `%` ของผู้ที่ยังไม่ตอบ

**สูตรคำนวณเปอร์เซ็นต์ผู้ตอบ**

Faculty Scope:

```sql
% = (users_who_answered / total_targeted_users) * 100

SELECT COUNT(*) FROM users
WHERE role IN (form_target_roles)
  AND faculty_id = form.faculty_id
  AND is_active = true
```

University Scope:

```sql
% = (users_who_answered / total_respondents_in_system) * 100

SELECT COUNT(*) FROM users
WHERE role IN ('teacher', 'staff', 'student')
  AND is_active = true
```

Rationale: ฟอร์ม `university` scope เปิดให้ respondent ทุกคนในระบบ ดังนั้น denominator คือ respondent ที่ active ทั้งระบบ

- **FR-D06** แสดงความคิดเห็น (Short Text) ทั้งหมด

### 4.7 User Management

- **FR-U01** eila_admin สามารถเพิ่ม / ลบ / แก้ไข `faculty_admin` และ `executive` ได้
  - "ลบ" = soft delete (`mark is_active = false`)
  - รองรับ single operation และ bulk operation (ดู FR-U07)
  - ทุก query ต้อง filter `WHERE is_active = true`
- **FR-U02** eila_admin กำหนด Faculty ให้ faculty_admin ได้ (เลือกจาก `faculties` table)
- **FR-U03** eila_admin จัดการ `faculties` table ได้ (เพิ่ม / ลบ / แก้ไขคณะ)
  - "ลบ" Faculty = soft delete และไม่อนุญาตถ้ามี user/form อยู่
- **FR-U04** eila_admin ดูภาพรวมผู้ใช้งานทั้งระบบได้

**FR-U07: Bulk User Import via XLSX**

- eila_admin สามารถ Import รายชื่อ user จำนวนมากผ่านไฟล์ `.xlsx` ได้
- Bulk import ใช้สำหรับ `faculty_admin` และ `executive` เท่านั้น ส่วน `teacher`, `staff`, `student` auto-create ผ่าน PSU Passport

**XLSX Format (required columns)**

| Column Name | Type | Required | หมายเหตุ |
|---|---|---|---|
| `psu_passport_id` | String | ✅ | UNIQUE identifier จาก PSU |
| `name` | String | ✅ | ชื่อ-นามสกุล, max 200 chars |
| `email` | String | ✅ | PSU email format `*@psu.ac.th` |
| `role` | Enum | ✅ | `faculty_admin` / `executive` เท่านั้น |
| `faculty_id` | UUID | ✅ | ต้องมีอยู่ใน `faculties` table |

**Validation Rules**

| Rule | Error Message |
|---|---|
| ไฟล์ต้องเป็น `.xlsx` | "ไฟล์ต้องเป็น .xlsx เท่านั้น" |
| Max 500 rows | "จำนวน user เกิน 500 แถว" |
| Max 5 MB | "ไฟล์ใหญ่เกิน 5 MB" |
| `psu_passport_id` ว่างเปล่า | "`psu_passport_id` แถวที่ N ว่างเปล่า" |
| `email` ไม่ใช่ format PSU | "`email` แถวที่ N ต้องเป็น @psu.ac.th" |
| `role` ไม่ถูกต้อง | "`role` แถวที่ N ต้องเป็น faculty_admin หรือ executive" |
| `faculty_id` ไม่มีใน DB | "`faculty_id` แถวที่ N ไม่พบในระบบ" |
| `psu_passport_id` ซ้ำในไฟล์ | "`psu_passport_id` แถวที่ N ซ้ำกันในไฟล์" |

**Import Flow**

```text
Upload .xlsx
  ↓
Validate format + all rows
  ↓
มี error? -> แสดง error report ทุก row ที่ผิด -> หยุด
  ↓
Preview table: แสดง N rows ที่จะ import
+ แยกแสดง: "สร้างใหม่ X คน" / "อัปเดต Y คน (psu_passport_id ซ้ำ)"
  ↓
Admin ยืนยัน -> INSERT หรือ UPSERT ทีละ row ใน transaction
  ↓
แสดงผลสรุป: สำเร็จ N คน + ล้มเหลว M คน (ถ้ามี)
  ↓
บันทึก audit log: BULK_IMPORT, entity_type: USER, count: N
```

**Conflict Handling (`psu_passport_id` ซ้ำ)**

- ถ้า user มีอยู่แล้วและ `is_active = true` ให้ update `role + faculty_id + name`
- ถ้า user มีอยู่แล้วและ `is_active = false` ให้ reactivate และอัปเดตข้อมูล

### 4.8 Notification System [Phase 2]

ช่องทาง: Email (SMTP PSU) + In-app (ไอคอนระฆังในระบบ)

| รหัสเหตุการณ์ | ผู้รับ | ช่องทาง |
|---|---|---|
| FR-N01 Admin เผยแพร่ฟอร์ม (`status -> open`) | Respondent ที่เกี่ยวข้องทุกคน | Email + In-app |
| FR-N02 เหลือ 3 วันก่อนปิด + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N03 เหลือ 1 วันก่อนปิด + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N04 Admin ขยายเวลา (`close_at` ถูกแก้ไข) | Respondent ที่เกี่ยวข้องทุกคน | Email + In-app |
| FR-N05 Respondent ส่งฟอร์มสำเร็จ | Respondent คนนั้น | In-app เท่านั้น |
| FR-N06 ฟอร์ม `closed` อัตโนมัติตาม Scheduler | faculty_admin เจ้าของฟอร์ม | In-app เท่านั้น |

**Respondent ที่เกี่ยวข้อง** ขึ้นอยู่กับ Form Scope:

Faculty Scope:

```sql
SELECT * FROM users
WHERE role IN (form_target_roles)
  AND faculty_id = form.faculty_id
  AND is_active = true
```

University Scope:

```sql
SELECT * FROM users
WHERE role IN ('teacher', 'staff', 'student')
  AND is_active = true
```

**Respondent ที่ยังไม่ตอบ** (`FR-N02`, `FR-N03`)

```sql
pending_recipients = recipients
WHERE NOT EXISTS (
  SELECT 1 FROM responses
  WHERE form_id = form.id AND user_id = user.id
)
```

หมายเหตุ: สำหรับ `university` scope ที่มี respondent จำนวนมาก ระบบส่ง email เป็น batch (`500 per batch`) เพื่อป้องกัน SMTP overload

- **FR-N07** In-app Notification แสดงเป็นไอคอนระฆัง บอกจำนวนที่ยังไม่อ่าน
- **FR-N08** ผู้ใช้สามารถกด Mark as Read / Mark All as Read ได้
- **FR-N09** Email แจ้งเตือนมีลิงก์ตรงไปยังฟอร์มนั้น

**Clarified Timing (`FR-N02`, `FR-N03`)**

- Reminder ส่งที่เวลา `9:00 AM` PSU timezone (`UTC+7`)
- "3 วัน" = `close_at - 72 ชั่วโมง`
- "1 วัน" = `close_at - 24 ชั่วโมง`

**Email Failure Handling (`FR-N10`)**

- Retry 3 ครั้งด้วย exponential backoff: 1 นาที -> 5 นาที -> 15 นาที
- บันทึก error ลง `notification_logs` table
- Retry ครบ 3 ครั้งแล้วยังไม่สำเร็จ ให้แจ้ง admin ผ่าน in-app

**FR-N11: Reminder Idempotency**

- ระบบบันทึก `reminder_3d_sent` และ `reminder_1d_sent` boolean flags ใน form
- ส่ง reminder แต่ละประเภทได้แค่ครั้งเดียวต่อ form
- ถ้า scheduler รันซ้ำ ให้ตรวจสอบ flag ก่อนส่ง
- Reset flag เมื่อ `close_at` ถูกแก้ไข (`FR-N04` trigger ส่งใหม่)

### 4.9 Error Handling

**FR-ERR01: Input Validation**

- ระบบ validate ทุก user input ก่อนประมวลผล
- Form title: required, max 200 chars
- Question text: required, max 1000 chars
- Website URL: must be valid URL format
- Rating value: integer 1-5
- Error response format: ดู Section 14.3

**FR-ERR02: Timeout Handling**

- API request timeout: 30 วินาที
- PSU Passport timeout -> แสดง "ไม่สามารถเชื่อมต่อระบบ PSU ได้ กรุณาลองใหม่อีกครั้ง"
- Retry PSU Passport API 3 ครั้งก่อนแจ้ง error

**FR-ERR03: JSON Import Error Handling**

- Validate JSON format ก่อน import
- Error messages ระบุชัดเจน เช่น "`question_text` ข้อที่ 3 ว่างเปล่า"

### 4.10 Audit Logging

**FR-U05: Audit Log**

ระบบบันทึกทุกการเปลี่ยนแปลงสำคัญ:

- สร้าง / แก้ไข / ลบ ฟอร์ม, Template, Faculty
- เปลี่ยน role ของ user, Bulk Import user
- Login / Logout
- Export ข้อมูล (PDF / Excel / JSON)
- `FALLBACK_FACULTY_ASSIGNED` (กรณี PSU ไม่ส่ง `faculty_id`)

Audit log เก็บข้อมูล: `user_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `ip_address`, `prev_hash`, `hash`, `timestamp`

- eila_admin ดู Audit Log ของทั้งระบบได้
- Audit log เก็บไว้ 1 ปี

**FR-U08: Audit Log Purge Scheduler**

- Scheduler รันทุกวันเวลา 03:00 น.
- ลบ record เก่ากว่า 365 วัน
- ก่อนลบ ให้ archive ไป `audit_logs_archive` table (เก็บไว้ 7 ปี)
- บันทึก audit log entry: `AUDIT_LOG_PURGE`, count: N rows purged

## 5. Non-Functional Requirements

### 5.1 General

- **NFR-01** Phase 1 ใช้ Single Role ต่อ User (Enum) รองรับ Multi-role ในอนาคตโดย migrate เป็น `user_roles` table
- **NFR-02** รองรับ Mobile (Responsive): breakpoints 320px / 768px / 1024px, test Safari iOS 13+, Chrome Android 8+
- **NFR-03** ทุก API ต้อง auth ยกเว้น `GET /api/health` และ `GET /api/forms/:id/public`
- **NFR-04** Audit Log track ทุกการเปลี่ยนแปลง (Tamper-proof)
- **NFR-05** รองรับ >= 10 concurrent admin users แก้ไขฟอร์มต่างกัน / ฟอร์มเดียวกัน -> Optimistic Locking
- **NFR-06** Max file import: 5 MB, max 500 questions, max 500 chars per text
- **NFR-07** Scheduler (`node-cron`) ตรวจสอบทุก 1-5 นาที / Acceptance: 98% ของฟอร์มเปลี่ยน status ภายใน 5 นาที
- **NFR-08** Notification scheduler รันทุก 1 ชั่วโมงที่เวลา 00 นาที
- **NFR-09** ทุก API query ต้อง filter by `user.faculty_id` (defense in depth)

### 5.2 Data Retention & Backup

**NFR-10: Data Retention**

- ข้อมูลเก่ากว่า 2 ปี ให้ archive ไป `forms_archive`, `responses_archive`, `answers_archive`
- ข้อมูลเก่ากว่า 5 ปี ลบได้ตามนโยบายมหาวิทยาลัย
- Scheduler รันทุกวันที่ 02:30 น.

**NFR-11: Backup & Recovery**

- Backup ทุกวันเวลา 02:00 น. และเก็บไว้ 7 วัน
- `RTO < 1 ชั่วโมง`, `RPO < 24 ชั่วโมง`
- มี off-site backup, ทดสอบ recovery ทุกเดือน, และมี runbook

### 5.3 Form Versioning

**NFR-12**

- ทุกครั้งที่แก้ไขโครงสร้างฟอร์ม ให้สร้าง version ใหม่ใน `form_versions` และเก็บ `questions_snapshot` (JSON)
- Admin ดู version history และ rollback ได้
- Rollback = สร้าง form ใหม่จาก snapshot เก่า ไม่ overwrite form ปัจจุบัน

**FR-ROLL01: Rollback Behavior**

- `POST /api/forms/:id/rollback` สร้าง form ใหม่จาก `questions_snapshot` เก่า
- ไม่แก้ไข form ปัจจุบัน
- Form ใหม่มี `status = 'draft'`, `copied_from = form.id`, `title = "[ชื่อเดิม] (Rollback v{version})"`
- Admin ต้อง review และ publish ด้วยตัวเอง

### 5.4 API Documentation

- **NFR-13** มี OpenAPI 3.0 spec สำหรับทุก REST API และ Swagger UI ที่ `/api/docs`

### 5.5 Performance

**NFR-14**

- API response time < 500ms (95th percentile)
- รองรับ 1000 concurrent users
- Dashboard load < 2 วินาที, Form submit < 1 วินาที

Note: ตัวเลข 1000 concurrent users เป็น target ตาม Deploy Infrastructure ที่จะกำหนดในภายหลัง (TBD) ขึ้นอยู่กับ server spec ที่ PSU จัดให้ และต้อง verify อีกครั้งก่อน Production

## 6. Security Requirements

### 6.1 Transport Security

- **NFR-SEC01** HTTPS/TLS 1.2+ ทุกช่องทาง

### 6.2 Authentication Security

- **NFR-SEC02** CSRF tokens สำหรับทุก `POST/PUT/DELETE` + `SameSite=Strict`
- **NFR-SEC07** Session cookies: Secure + HttpOnly + SameSite=Strict, random via CSPRNG
- **NFR-SEC10** OAuth 2.0 PKCE flow, validate state param, verify JWT signature

### 6.3 Input/Output Security

- **NFR-SEC03** XSS Prevention: sanitize/escape ทุก input, CSP header, ห้าม `dangerouslySetInnerHTML` โดยไม่ sanitize
- **NFR-SEC04** SQL Injection Prevention: parameterized queries / ORM ทุก operation
- **NFR-SEC06** File Upload: JSON only, max 5 MB, scan malicious content, เก็บนอก web root, ลบทันทีหลังประมวลผล

### 6.4 API Security

**NFR-SEC05: Rate Limiting**

- 100 req/min per IP
- 50 req/min per user
- Login: 5 attempts/min per IP
- Response: HTTP 429

- **NFR-SEC08** Faculty-Level Authorization ต้อง validate ทั้งที่ middleware และ query

### 6.5 Audit & Monitoring

- **NFR-SEC09** Append-only audit log, SHA-256 hash chain, เก็บ 1 ปี

**NFR-SEC11: Encryption at Rest**

- Email: AES-256
- Responses: AES-256 (optional)
- `ENCRYPTION_KEY` เก็บใน environment variable ห้าม hardcode / commit เข้า Git
- Production: พิจารณา KMS (AWS KMS / HashiCorp Vault) ตาม PSU infrastructure (TBD ก่อน Production)
- Key rotation ทุก 6 เดือน พร้อม re-encrypt

- **NFR-SEC12** Security Monitoring: alert เมื่อ failed login >5/min, error rate spike

### 6.6 Role Override Security

**FR-U06: Role Override — Phase 1: Email OTP**

- เฉพาะ eila_admin เท่านั้น
- กด "Override Role" -> ส่ง OTP 6 หลักไปยัง PSU Email ของ eila_admin
- OTP อายุ 5 นาที และใช้ได้ครั้งเดียว
- กรอกผิด 3 ครั้ง -> block 15 นาที
- Phase 2: เพิ่ม TOTP (Google Authenticator)
- ทุก role override บันทึกใน audit log
- User ที่ถูก override ได้รับ notification

## 7. Database Schema

### 7.1 `faculties`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `name_th` | String | ชื่อคณะภาษาไทย |
| `name_en` | String | ชื่อคณะภาษาอังกฤษ |
| `is_active` | Boolean | Soft delete (default: true) |
| `created_at` | DateTime |  |
| `updated_at` | DateTime |  |

ต้องมี Faculty "PSU General" สำหรับใช้เป็น `FALLBACK_FACULTY_ID`

### 7.2 `users`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `psu_passport_id` | String | UNIQUE |
| `name` | String | ชื่อ-นามสกุล |
| `email` | String | AES-256 encrypted |
| `role` | Enum | eila_admin / faculty_admin / executive / teacher / staff / student |
| `faculty_id` | UUID | FK -> faculties (`NULL` สำหรับ eila_admin) |
| `is_active` | Boolean | Soft delete (default: true) |
| `last_login_at` | DateTime |  |
| `created_at` | DateTime |  |
| `updated_at` | DateTime |  |

### 7.3 `templates`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `name` | String | ชื่อ Template |
| `description` | String | คำอธิบาย |
| `scope` | Enum | faculty / global |
| `faculty_id` | UUID | FK -> faculties (`NULL` ถ้า scope = global) |
| `created_by` | UUID | FK -> users |
| `created_at` | DateTime |  |

### 7.4 `template_questions`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `template_id` | UUID | FK -> templates |
| `question_text` | String |  |
| `question_type` | Enum | rating / short_text |
| `order` | Integer |  |
| `required` | Boolean |  |
| `created_at` | DateTime |  |

### 7.5 `forms`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `title` | String | ชื่อฟอร์ม |
| `website_url` | String | URL เว็บที่ประเมิน |
| `scope` | Enum | faculty / university |
| `faculty_id` | UUID | FK -> faculties (`NULL` ถ้า scope = university) |
| `template_id` | UUID | FK -> templates (nullable) |
| `copied_from` | UUID | FK -> forms (nullable) |
| `imported_from` | String | ชื่อไฟล์ที่ Import มา (nullable) |
| `status` | Enum | draft / open / closed |
| `open_at` | DateTime | nullable |
| `close_at` | DateTime | nullable |
| `version` | Integer | Optimistic locking (default: 1) |
| `created_by` | UUID | FK -> users |
| `created_at` | DateTime |  |
| `updated_at` | DateTime |  |

### 7.6 `form_questions`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `form_id` | UUID | FK -> forms |
| `question_text` | String |  |
| `question_type` | Enum | rating / short_text |
| `order` | Integer | Drag & Drop |
| `required` | Boolean |  |
| `created_at` | DateTime |  |

คำถามทุกข้ออยู่ใน `form_questions` เสมอ ไม่ว่าจะสร้างเอง / Clone จาก Template / Import จาก JSON

### 7.7 `form_target_roles`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `form_id` | UUID | FK -> forms |
| `role` | Enum | teacher / staff / student |

ใช้เฉพาะฟอร์ม `scope = faculty` และฟอร์ม `scope = university` ไม่มี record ในตารางนี้

### 7.8 `responses`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `form_id` | UUID | FK -> forms |
| `user_id` | UUID | FK -> users |
| `submitted_at` | DateTime | วันที่ส่งครั้งแรก |
| `updated_at` | DateTime |  |

Constraint: `UNIQUE (form_id, user_id)`

### 7.9 `answers`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `response_id` | UUID | FK -> responses |
| `question_id` | UUID | FK -> form_questions |
| `rating_value` | Integer | ถ้าเป็น Rating (1-5) |
| `text_value` | String | ถ้าเป็น Short Text |
| `created_at` | DateTime |  |
| `updated_at` | DateTime |  |

Constraint: `UNIQUE (response_id, question_id)`

### 7.10 `notifications` [Phase 2]

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `user_id` | UUID | FK -> users |
| `type` | Enum | form_opened / reminder_3d / reminder_1d / deadline_extended / submitted / form_closed |
| `form_id` | UUID | FK -> forms |
| `message` | String |  |
| `is_read` | Boolean |  |
| `created_at` | DateTime |  |

### 7.11 `audit_logs`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `user_id` | UUID | FK -> users |
| `action` | Enum | CREATE / UPDATE / DELETE / LOGIN / LOGOUT / EXPORT / BULK_IMPORT / FALLBACK_FACULTY_ASSIGNED |
| `entity_type` | Enum | FORM / TEMPLATE / USER / FACULTY / RESPONSE |
| `entity_id` | UUID | ID ของ entity ที่ถูกทำ |
| `old_value` | JSON | ค่าเดิม |
| `new_value` | JSON | ค่าใหม่ |
| `ip_address` | String |  |
| `prev_hash` | String | SHA-256 hash ของ record ก่อนหน้า |
| `hash` | String | SHA-256 hash ของ record นี้ |
| `created_at` | DateTime |  |

**Hash Chain Implementation**

```text
hash = SHA256(
  id + user_id + action + entity_id +
  JSON.stringify(old_value) + JSON.stringify(new_value) +
  prev_hash + created_at.toISOString()
)
```

- `prev_hash` ของ record แรก = `'0'.repeat(64)`
- ทุก record ใหม่: `prev_hash = hash` ของ record ก่อนหน้า
- ไม่มี `UPDATE/DELETE` permission บน table นี้ (append-only)

### 7.12 `form_versions`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `form_id` | UUID | FK -> forms |
| `version` | Integer | version number |
| `questions_snapshot` | JSON | Snapshot ของคำถาม |
| `changed_by` | UUID | FK -> users |
| `changed_at` | DateTime |  |

### 7.13 `notification_logs`

| Field | Type | หมายเหตุ |
|---|---|---|
| `id` | UUID | Primary Key |
| `notification_id` | UUID | FK -> notifications |
| `attempt` | Integer | ครั้งที่ retry (1, 2, 3) |
| `status` | Enum | success / failed |
| `error_message` | String |  |
| `created_at` | DateTime |  |

### 7.14 Recommended Indexes

| Table | Index | Purpose |
|---|---|---|
| `forms` | `idx_forms_faculty_id` | Filter by faculty |
| `forms` | `idx_forms_scope_faculty` | Composite `(scope, faculty_id)` |
| `form_target_roles` | `idx_form_target_roles_form_id` | Join query |
| `form_target_roles` | `idx_form_target_roles_role` | Filter by role |
| `audit_logs` | `idx_audit_logs_user_id` | Audit trail |
| `audit_logs` | `idx_audit_logs_entity(entity_type, entity_id)` | Entity lookup |
| `audit_logs` | `idx_audit_logs_created_at` | Time-based queries |
| `responses` | `idx_responses_form_user` | UNIQUE constraint |
| `users` | `idx_users_faculty_id` | Filter by faculty |
| `users` | `idx_users_psu_passport` | Login lookup |
| `notifications` | `idx_notifications_user_read(user_id, is_read)` | Notification unread lookup |

## 8. Import/Export JSON Specification

### 8.1 โครงสร้าง JSON มาตรฐาน

```json
{
  "eila_schema_version": "1.0",
  "form_title": "ชื่อฟอร์ม",
  "exported_at": "2026-04-24T10:00:00Z",
  "questions": [
    {
      "order": 1,
      "question_text": "ข้อคำถาม",
      "question_type": "rating",
      "required": true
    },
    {
      "order": 2,
      "question_text": "ข้อเสนอแนะ",
      "question_type": "short_text",
      "required": false
    }
  ]
}
```

### 8.2 Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| `questions` | ต้องเป็น Array | `"questions ต้องเป็น Array"` |
| `question_text` | ต้องมีค่า ไม่ว่าง | `"question_text ข้อที่ N ว่างเปล่า"` |
| `question_type` | `rating` หรือ `short_text` | `"question_type ข้อที่ N ไม่ถูกต้อง"` |
| `required` | boolean | `"required ข้อที่ N ต้องเป็น true/false"` |
| `order` | Integer | `"order ข้อที่ N ต้องเป็นตัวเลข"` |
| file size | Max 5 MB | `"ไฟล์ใหญ่เกิน 5 MB"` |
| questions count | Max 500 | `"คำถามเกิน 500 ข้อ"` |
| text length | Max 1000 chars | `"question_text ข้อที่ N ยาวเกิน 1000 ตัวอักษร"` |

### 8.3 Import Conflict Flow

```text
มีคำถามในฟอร์มอยู่แล้ว + Import ใหม่
          ↓
ระบบแสดง Dialog
┌─────────────────────────────────┐
│ ฟอร์มมีคำถามอยู่แล้ว 5 ข้อ     │
│ ต้องการ Import 8 คำถามใหม่      │
│                                 │
│ [เพิ่มต่อท้าย] [แทนที่ทั้งหมด]  │
└─────────────────────────────────┘
```

## 9. หน้าเว็บ (Pages)

### 9.1 ทั่วไป

| Path | คำอธิบาย |
|---|---|
| `/` | Landing Page + ปุ่ม Login |
| `/auth/callback` | PSU Passport OAuth Callback |

### 9.2 eila_admin

| Path | คำอธิบาย |
|---|---|
| `/eila-admin/dashboard` | ภาพรวมระบบทั้งหมดทุก Faculty |
| `/eila-admin/users` | จัดการผู้ใช้ทุก Role |
| `/eila-admin/users/bulk-import` | Bulk Import ผู้ใช้ผ่าน XLSX |
| `/eila-admin/faculties` | จัดการ Faculty |
| `/eila-admin/forms` | รายการฟอร์มทั้งหมดทุก Faculty |
| `/eila-admin/forms/create` | สร้างฟอร์มใหม่ (เลือก scope ได้) |
| `/eila-admin/forms/[id]/edit` | แก้ไขฟอร์ม |
| `/eila-admin/forms/[id]/results` | ดูผลลัพธ์ + Export |
| `/eila-admin/templates` | รายการ Template ทั้งหมด |
| `/eila-admin/audit-logs` | ดู Audit Log ทั้งระบบ |

### 9.3 faculty_admin

| Path | คำอธิบาย |
|---|---|
| `/admin/dashboard` | สรุปภาพรวมฟอร์มของ Faculty ตัวเอง |
| `/admin/forms` | รายการฟอร์มของ Faculty ตัวเอง |
| `/admin/forms/create` | สร้างฟอร์มใหม่ (`faculty` scope) |
| `/admin/forms/[id]/edit` | แก้ไขฟอร์ม + Drag & Drop + Import/Export + ตั้งเวลา |
| `/admin/forms/[id]/copy` | Copy ฟอร์ม |
| `/admin/forms/[id]/results` | ดูผลลัพธ์ + Export |
| `/admin/forms/[id]/versions` | ดู Version History |
| `/admin/templates` | Template ของ Faculty + global |
| `/admin/templates/create` | สร้าง Template ใหม่ |
| `/admin/templates/[id]/edit` | แก้ไข Template |

### 9.4 executive

| Path | คำอธิบาย |
|---|---|
| `/executive/dashboard` | Dashboard ทุกฟอร์มทุก Faculty |
| `/executive/forms/[id]/results` | ดูผลลัพธ์ + Export |

### 9.5 Respondent

| Path | คำอธิบาย |
|---|---|
| `/home` | รายการฟอร์มที่ได้รับ พร้อม Status |
| `/forms/[id]` | หน้าตอบฟอร์ม |
| `/forms/[id]/done` | หน้ายืนยันส่งแล้ว |

## 10. แผนการพัฒนา (Development Phases)

### Phase 1 — MVP

- PSU Passport Login + Role Resolution + Auto-create User + FR-AUTH05 Fallback
- 6 Role พร้อม Faculty Scope + Data Isolation
- `faculties` table + eila_admin จัดการ Faculty
- Form Builder แบบ Form-first (Drag & Drop)
- Form Scope: faculty / university
- Template Scope: faculty / global
- Form Date: `open_at` / `close_at` + Auto-close Scheduler (`node-cron`)
- Template System (Clone เข้า `form_questions`)
- Copy ฟอร์มเก่า
- Import / Export JSON
- ตอบฟอร์มตาม Role + Scope + Status
- UNIQUE Constraint ป้องกันส่งซ้ำ
- Dashboard แยก Faculty
- Optimistic Locking (FR-F18)
- Session Management (FR-AUTH01-04)
- Audit Logging + Hash Chain (FR-U05, NFR-SEC09)
- Error Handling (FR-ERR01-03)
- Role Override + Email OTP 2FA (FR-U06)
- Bulk XLSX Import (FR-U07)
- Security Requirements (NFR-SEC01-12)

### Phase 2 — ปรับปรุง

- Export PDF & Excel
- กราฟ Analytics
- Dashboard Executive
- Notification System (Email + In-app)
- Form Versioning + Rollback (NFR-12, FR-ROLL01)
- Data Retention & Backup (NFR-10, NFR-11)
- Role Override TOTP 2FA

### Phase 3 — ขยาย

- เพิ่มประเภทคำถาม
- eila_admin Panel เต็มรูปแบบ
- Audit Log UI
- Multi-role Support
- API Documentation (NFR-13)
- Performance Optimization (NFR-14)

## 11. การแบ่งงาน (Team)

### คนที่ 1 — Backend + Auth

- ติดตั้ง Fastify + PostgreSQL
- PSU Passport OAuth + Role Resolution + Auto-create + FR-AUTH05 Fallback
- OAuth PKCE flow (NFR-SEC10)
- Session Management (FR-AUTH01-04)
- API: faculties CRUD
- API: users / roles / permissions / faculty scope + Data Isolation
- API: audit_logs (append-only + SHA-256 hash chain + verify endpoint)
- API: forms CRUD + Scope + Optimistic Locking
- API: templates CRUD + Scope
- API: form_questions / form_target_roles
- API: responses / answers (Upsert + UNIQUE)
- API: Import JSON + Export JSON
- API: Bulk XLSX Import (FR-U07)
- Scheduler (`node-cron`): Auto open/close
- Scheduler: Notification trigger (Phase 2)
- Error Handling (FR-ERR01-03)
- Export PDF + Excel (Phase 2)
- Email Notification + retry logic (Phase 2)
- Role Override API + Email OTP (FR-U06)
- Security: Rate Limiting, CSRF, Encryption

### คนที่ 2 — Frontend

- Next.js + Tailwind
- หน้า Login / PSU Passport Callback
- Session timeout warning UI
- Form Builder Drag & Drop + ตั้งเวลา `open_at`/`close_at`
- Form Scope Selector (eila_admin เท่านั้น)
- Template Scope badges
- Import JSON: Upload -> Validate -> Preview -> Confirm
- Export JSON button
- Bulk XLSX Import UI (preview table + error report)
- Template Picker & Clone
- Copy Form feature
- หน้าตอบฟอร์ม + Status + แสดงคำตอบเดิม
- Admin Dashboard + กราฟ
- eila_admin หน้าจัดการ Faculty + Forms
- Audit Log Viewer
- Optimistic locking conflict dialog
- Error message display
- Email OTP modal สำหรับ Role Override
- Executive Dashboard (Phase 2)
- In-app Notification (Phase 2)

## 12. Git Branch Strategy

### 12.1 โครงสร้าง Branch

```text
main
└── develop
    ├── feature/backend-xxx   (คนที่ 1)
    ├── feature/frontend-xxx  (คนที่ 2)
    └── hotfix/xxx            (กรณี Bug เร่งด่วน)
```

| Branch | วัตถุประสงค์ | Merge ไปที่ |
|---|---|---|
| `main` | Production | - |
| `develop` | รวมงานก่อน Release | `main` |
| `feature/xxx` | งานแต่ละชิ้น | `develop` |
| `hotfix/xxx` | Bug เร่งด่วน | `main` และ `develop` |

❌ ห้าม push ตรงเข้า `main` เด็ดขาด

### 12.2 Feature Branches

**คนที่ 1 — Backend**

- `feature/backend-setup`
- `feature/backend-auth-psu`
- `feature/backend-faculties-api`
- `feature/backend-users-api`
- `feature/backend-bulk-import`
- `feature/backend-forms-api`
- `feature/backend-templates-api`
- `feature/backend-responses-api`
- `feature/backend-import-export`
- `feature/backend-scheduler`
- `feature/backend-audit-logging`
- `feature/backend-session-mgmt`
- `feature/backend-security`
- `feature/backend-role-override-otp`
- `feature/backend-notifications` [Phase 2]
- `feature/backend-export-pdf-excel` [Phase 2]

**คนที่ 2 — Frontend**

- `feature/frontend-setup`
- `feature/frontend-login`
- `feature/frontend-form-builder`
- `feature/frontend-form-scope`
- `feature/frontend-import-export-ui`
- `feature/frontend-bulk-import-ui`
- `feature/frontend-templates`
- `feature/frontend-respondent`
- `feature/frontend-admin-dashboard`
- `feature/frontend-eila-admin`
- `feature/frontend-audit-log-viewer`
- `feature/frontend-session-timeout`
- `feature/frontend-role-override-otp`
- `feature/frontend-executive-dashboard` [Phase 2]
- `feature/frontend-notifications` [Phase 2]

### 12.3 Commit Message Convention

| Prefix | ใช้เมื่อ |
|---|---|
| `feat:` | เพิ่มฟีเจอร์ใหม่ |
| `fix:` | แก้ Bug |
| `hotfix:` | แก้ Bug เร่งด่วน Production |
| `chore:` | Config / Setup |
| `refactor:` | ปรับโค้ด |
| `docs:` | แก้ Documentation |
| `style:` | แก้ UI/CSS |
| `security:` | Security-related |

## 13. Test Cases

### 13.1 Authentication Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `AUTH-01` | PSU Passport Login | Auto-create user with correct role + faculty |
| `AUTH-02` | PSU ไม่ส่ง `faculty_id` | Assign `FALLBACK_FACULTY_ID` + audit log บันทึก |
| `AUTH-03` | PSU ไม่ส่ง `role` | Default เป็น student |
| `AUTH-04` | Session timeout after 30 min | Redirect to login |
| `AUTH-05` | Logout clears session | ไม่สามารถเข้า protected routes |
| `AUTH-06` | Role override by eila_admin | Role updated + audit log |

### 13.2 Form Visibility Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `FORM-VIS-01` | faculty form visible to same faculty | Respondent เห็นฟอร์ม |
| `FORM-VIS-02` | faculty form not visible to other faculty | ไม่เห็น |
| `FORM-VIS-03` | university form visible to all respondents | ทุกคนเห็น |
| `FORM-VIS-04` | faculty_admin sees only own faculty forms | 403 สำหรับ faculty อื่น |

### 13.3 Dashboard % Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `DASH-01` | % ผู้ตอบ — faculty scope | denominator = users ใน faculty ที่ตรง target_roles |
| `DASH-02` | % ผู้ตอบ — university scope | denominator = users role IN (teacher, staff, student) ทั้งระบบ |
| `DASH-03` | university scope ไม่มี `form_target_roles` | ไม่ error และใช้สูตร university scope |

### 13.4 Bulk Import Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `BULK-01` | Import 100 users ถูกต้อง | สร้าง 100 users + audit log |
| `BULK-02` | Import มี column ขาด | Error report บอก column ที่ขาด |
| `BULK-03` | `faculty_id` ไม่มีใน DB | Error: "`faculty_id` แถวที่ N ไม่พบในระบบ" |
| `BULK-04` | `psu_passport_id` ซ้ำในไฟล์ | Error: แถวที่ซ้ำ |
| `BULK-05` | `psu_passport_id` มีอยู่แล้วใน DB | Upsert (อัปเดตข้อมูล) |
| `BULK-06` | Import user ที่ `is_active=false` | Reactivate + อัปเดตข้อมูล |
| `BULK-07` | `role` เป็น teacher (ไม่อนุญาต) | Error: "`role` ต้องเป็น faculty_admin หรือ executive" |
| `BULK-08` | ไฟล์เกิน 500 rows | Error: จำนวน user เกิน 500 แถว |

### 13.5 Security Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `SEC-01` | CSRF token validation | Request ที่ไม่มี CSRF token ถูก reject |
| `SEC-02` | SQL injection attempt | Query parameterized, ไม่ถูก inject |
| `SEC-03` | XSS in form title | Title escaped on output |
| `SEC-04` | Rate limiting | >100 req/min -> 429 |
| `SEC-05` | faculty_admin access other faculty API | 403 Forbidden |

### 13.6 Notification Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `NOTIF-01` | Reminder — faculty scope, user ยังไม่ตอบ | ส่ง email + in-app ถึง user ใน faculty ที่ตรง role |
| `NOTIF-02` | Reminder — university scope | ส่งถึง teacher/staff/student ทั้งระบบที่ยังไม่ตอบ |
| `NOTIF-03` | User ตอบแล้ว — university scope | ไม่ได้รับ reminder |
| `NOTIF-04` | Email fail 3 ครั้ง | Mark failed + แจ้ง admin in-app |

### 13.7 Rollback Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `ROLL-01` | `POST /api/forms/:id/rollback` | สร้าง form ใหม่ `status=draft` จาก snapshot |
| `ROLL-02` | Form เดิมไม่ถูกแก้ไข | Form ปัจจุบันยังคงเหมือนเดิม |
| `ROLL-03` | Form ใหม่มี title `"[ชื่อเดิม] (Rollback vN)"` | Title ถูกต้อง |

### 13.8 Concurrent Editing Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `CONC-01` | Two admins edit same form | Second save shows conflict dialog |
| `CONC-02` | Optimistic locking version mismatch | Warning + diff แสดง |

### 13.9 Scheduler Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `SCH-01` | Form opens at `open_at` | Status -> `open` ภายใน 5 นาที |
| `SCH-02` | Form closes at `close_at` | Status -> `closed` ภายใน 5 นาที |
| `SCH-03` | Reminder 3 days before | Email + in-app ส่งที่ 9:00 AM |

### 13.10 Soft Delete Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `DEL-01` | Deleted user has `is_active=false` | ไม่ login ได้ แต่ data ยังอยู่ |
| `DEL-02` | Queries filter inactive | `is_active=true` อัตโนมัติ |
| `DEL-03` | Faculty delete with existing forms | Delete ถูก block |

### 13.11 Role Override 2FA Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `OTP-01` | eila_admin triggers role override | Email OTP ส่งไปยัง PSU Email |
| `OTP-02` | OTP ถูกต้อง | Override สำเร็จ + audit log |
| `OTP-03` | OTP ผิด 3 ครั้ง | Block 15 นาที |
| `OTP-04` | OTP หมดอายุ 5 นาที | OTP ถูก reject |
| `OTP-05` | Target user รับ notification | Notification ส่งสำเร็จ |

### 13.12 Audit Log Hash Chain Tests

| Test ID | Description | Expected Result |
|---|---|---|
| `HASH-01` | First audit log record | `prev_hash = '0'.repeat(64)` |
| `HASH-02` | Chain integrity after 100 records | Verify endpoint ผ่าน |
| `HASH-03` | Tamper detection | Modified record -> chain verify fails |
| `HASH-04` | Audit log append-only | `UPDATE/DELETE` -> permission error |

## 14. Appendix

### 14.1 Form Visibility Pseudocode

```typescript
function canUserSeeForm(user: User, form: Form): boolean {
  if (user.role === 'eila_admin') return true
  if (user.role === 'executive') return true
  if (form.scope === 'university') return true
  if (form.scope === 'faculty') {
    if (user.role === 'faculty_admin' && user.faculty_id === form.faculty_id) return true
    if (user.faculty_id === form.faculty_id) {
      const targetRoles = getFormTargetRoles(form.id)
      return targetRoles.includes(user.role)
    }
    return false
  }
  return false
}

function canUserEditForm(user: User, form: Form): boolean {
  if (user.role === 'eila_admin') return true
  if (user.role === 'faculty_admin') return user.faculty_id === form.faculty_id
  return false
}
```

### 14.2 Notification Recipients Pseudocode

```typescript
function getFormRecipients(form: Form): User[] {
  if (form.scope === 'university') {
    return db.users.findAll({
      where: {
        role: { in: ['teacher', 'staff', 'student'] },
        is_active: true
      }
    })
  }
  if (form.scope === 'faculty') {
    const targetRoles = getFormTargetRoles(form.id)
    return db.users.findAll({
      where: {
        role: { in: targetRoles },
        faculty_id: form.faculty_id,
        is_active: true
      }
    })
  }
  return []
}

function getPendingRecipients(form: Form): User[] {
  const all = getFormRecipients(form)
  const answered = db.responses
    .findAll({ where: { form_id: form.id } })
    .map(r => r.user_id)
  return all.filter(u => !answered.includes(u.id))
}
```

### 14.3 API Error Response Schema

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [
      {
        "field": "field_name",
        "message": "Field-specific error"
      }
    ],
    "stack": "Stack trace (development only)"
  }
}
```

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Version conflict (optimistic locking) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### 14.4 Glossary

| Term | Definition |
|---|---|
| PSU Passport | OAuth provider ของมหาวิทยาลัย |
| Faculty | คณะ/วิทยาลัยในมหาวิทยาลัย |
| Respondent | ผู้ตอบแบบประเมิน (teacher/staff/student) |
| Form Scope | ขอบเขตการมองเห็นฟอร์ม (faculty/university) |
| Template Scope | ขอบเขต template (faculty/global) |
| Optimistic Locking | Concurrent editing strategy ด้วย version number |
| Soft Delete | mark `is_active=false` ไม่ลบข้อมูลจริง |
| Hash Chain | SHA-256 linked chain สำหรับ tamper-proof audit log |
| Email OTP | One-Time Password ส่งผ่าน PSU Email สำหรับ 2FA |
| KMS | Key Management Service สำหรับ encryption key |
| `FALLBACK_FACULTY_ID` | Faculty default เมื่อ PSU ไม่ส่ง `faculty_id` |
| Rollback | สร้าง form ใหม่จาก version snapshot เก่า |

## 15. API Endpoints Specification

### 15.1 Authentication [Phase 1]

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/auth/psu` | Redirect to PSU Passport | ❌ |
| GET | `/api/auth/callback` | OAuth callback | ❌ |
| POST | `/api/auth/logout` | Logout | ✅ |
| GET | `/api/auth/me` | Current user info | ✅ |
| GET | `/api/health` | Health check | ❌ |

### 15.2 Forms [Phase 1]

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/forms` | List forms (filtered by scope/role) | ✅ |
| GET | `/api/forms/:id` | Get form by ID | ✅ |
| POST | `/api/forms` | Create new form | ✅ |
| PUT | `/api/forms/:id` | Update form (optimistic locking) | ✅ |
| DELETE | `/api/forms/:id` | Soft delete form | ✅ |
| POST | `/api/forms/:id/duplicate` | Copy form | ✅ |

### 15.3 Form Versioning [Phase 2]

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/forms/:id/versions` | Get version history | ✅ |
| POST | `/api/forms/:id/rollback` | Create new form from old snapshot | ✅ |

`POST /api/forms/:id/rollback` สร้าง form ใหม่ `status=draft` จาก `questions_snapshot` ที่ระบุ และไม่ overwrite form ปัจจุบัน (ดู FR-ROLL01)

Example request body:

```json
{ "version": 3 }
```

### 15.4 Responses [Phase 1]

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/forms/:id/responses` | List responses | ✅ |
| POST | `/api/forms/:id/responses` | Submit response (Upsert) | ✅ |
| GET | `/api/responses/:id` | Get response by ID | ✅ |
| PUT | `/api/responses/:id` | Update response | ✅ |

### 15.5 Templates [Phase 1]

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/templates` | List templates (faculty + global) | ✅ |
| POST | `/api/templates` | Create template | ✅ |
| PUT | `/api/templates/:id` | Update template | ✅ |
| DELETE | `/api/templates/:id` | Delete template | ✅ |

### 15.6 Admin — eila_admin only [Phase 1]

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/admin/users` | List all users | ✅ eila_admin |
| POST | `/api/admin/users` | Create user | ✅ eila_admin |
| PUT | `/api/admin/users/:id` | Update user | ✅ eila_admin |
| DELETE | `/api/admin/users/:id` | Soft delete user | ✅ eila_admin |
| POST | `/api/admin/users/bulk-import` | Bulk import via XLSX | ✅ eila_admin |
| GET | `/api/admin/faculties` | List faculties | ✅ eila_admin |
| POST | `/api/admin/faculties` | Create faculty | ✅ eila_admin |
| PUT | `/api/admin/faculties/:id` | Update faculty | ✅ eila_admin |
| DELETE | `/api/admin/faculties/:id` | Soft delete faculty | ✅ eila_admin |
| GET | `/api/admin/audit-logs` | List audit logs | ✅ eila_admin |
| GET | `/api/admin/audit-logs/verify` | Verify hash chain | ✅ eila_admin |
| POST | `/api/admin/users/:id/role-override/request` | Request Email OTP | ✅ eila_admin |
| POST | `/api/admin/users/:id/role-override/confirm` | Confirm OTP + execute | ✅ eila_admin |

### 15.7 Export / Import [Phase 1 / Phase 2]

| Method | Endpoint | Description | Auth | Phase |
|---|---|---|---|---|
| GET | `/api/forms/:id/export` | Export structure as JSON | ✅ | 1 |
| POST | `/api/forms/:id/import` | Import structure from JSON | ✅ | 1 |
| GET | `/api/forms/:id/export/pdf` | Export results as PDF | ✅ | 2 |
| GET | `/api/forms/:id/export/xlsx` | Export results as Excel | ✅ | 2 |

### 15.8 Notifications [Phase 2]

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/notifications` | List user's notifications | ✅ |
| GET | `/api/notifications/unread-count` | Get unread count | ✅ |
| PUT | `/api/notifications/:id/read` | Mark notification as read | ✅ |
| PUT | `/api/notifications/read-all` | Mark all as read | ✅ |

Error Response Schema: ดู Section 14.3

## 16. สรุปการแก้ไข

### v1.6 — แก้ไข 5 ข้อจาก Final Sanity Check

รายละเอียดตาม SRS v1.6

### v1.7.1 — แก้ไข 8 ข้อจาก Spec Review

| # | Issue | การแก้ไข |
|---|---|---|
| 1 | FR-AUTH05: Faculty fallback มี 2 ทางเลือก [Critical] | ระบุ definitive: auto-assign `FALLBACK_FACULTY_ID` + user เห็นเฉพาะ university scope จนกว่า admin จะ assign faculty ถูกต้อง |
| 2 | FR-D05: University scope ไม่มี denominator [Critical] | เพิ่มสูตรแยก: university scope ใช้ total active teacher/staff/student ทั้งระบบ |
| 3 | FR-U01: Bulk XLSX ไม่มี spec [Critical] | เพิ่ม FR-U07 ครบ: XLSX format, validation rules, import flow, conflict handling, API endpoint, test cases |
| 4 | FR-N02/N03: University scope recipients undefined [Critical] | เพิ่ม pseudocode `getFormRecipients()` แยก faculty/university scope + batch send 500/batch |
| 5 | Section 15: ไม่มี Phase labels [Advisory] | เพิ่ม [Phase 1] / [Phase 2] ทุก endpoint |
| 6 | Notification API endpoints หายไปจาก Section 15 [Advisory] | เพิ่ม Section 15.8 Notifications (`GET list`, `unread-count`, `PUT read`, `read-all`) |
| 7 | POST `/restore` naming vs behavior conflict [Advisory] | เปลี่ยนเป็น `POST /rollback` + เพิ่ม FR-ROLL01 ระบุ behavior ชัดเจน |
| 8 | Scheduler technology ยังเป็น OR [Advisory] | Confirm: `node-cron` (Node.js native) |

### v1.8 — เพิ่ม 3 ข้อ

| # | Issue | การแก้ไข |
|---|---|---|
| 1 | FR-F19/F20/F21: URL validation [Medium] | เพิ่ม validation + HEAD check + warning dialog |
| 2 | FR-N11: Reminder idempotency [Medium] | เพิ่ม flag ป้องกันส่ง reminder ซ้ำ |
| 3 | FR-U08: Audit log purge [Low] | เพิ่ม scheduler archive + purge 365 วัน |

eila — Web Evaluation System | SRS v1.8 | 2026-04-24
Prince of Songkla University
SRS v1.8 — ครบทั้ง 58 ข้อ (42 จาก v1.5 + 5 จาก v1.6 + 8 จาก v1.7.1 + 3 จาก v1.8)
