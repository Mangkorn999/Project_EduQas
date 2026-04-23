# eila — Software Requirements Specification (SRS)

> ระบบประเมินเว็บไซต์มหาวิทยาลัย / Web Evaluation System
> Prince of Songkla University
> **Version 1.5 | Updated: 2026-04-23**
> **SRS Changelog from v1.4:** แก้ไข 42 ข้อจาก SRS Review — Missing 10, Ambiguous 8, Conflicting 3, Untestable 7, Security Gaps 14

---

## Changelog

| Version | วันที่ | สิ่งที่เปลี่ยน |
|---------|--------|--------------|
| 1.0 | 2026-04-23 | Initial SRS |
| 1.1 | 2026-04-23 | เพิ่ม Faculty Structure, Form-first Concept, Import/Export, แก้ DB Schema, ยืนยัน Status Flow |
| 1.2 | 2026-04-23 | เพิ่ม faculties table, Form Scope (faculty/university), Form Date Auto-close, Notification System |
| 1.3 | 2026-04-23 | เพิ่ม Git Branch Strategy (หัวข้อ 11) |
| 1.4 | 2026-04-23 | Template Scope (faculty_id + scope), eila_admin แยก Path, UNIQUE Constraint, University Scope Logic, Hotfix Branch, แยก eila_version ออกจาก SRS Version |
| **1.5** | **2026-04-23** | **แก้ไข 42 ข้อจาก SRS Review: Security 14 ข้อ, Missing 10 ข้อ, Ambiguous 8 ข้อ, Untestable 7 ข้อ, Conflicting 3 ข้อ** |

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
| Scheduler (Auto-close) | node-cron หรือ pg_cron |
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

### 2.2 faculty_admin
- Admin ประจำแต่ละ Faculty
- **สร้างได้เฉพาะฟอร์ม `faculty` scope ของตัวเองเท่านั้น (ไม่สร้าง `university` scope)**
- **เห็นและจัดการได้เฉพาะฟอร์ม / Template ของ Faculty ตัวเองเท่านั้น**
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

```
PSU Passport Login
↓
ดึง psu_passport_id + role + faculty จาก PSU
↓
เช็ค users table ว่ามีการ Override role ไหม?
├── มี Override → ใช้ role จาก DB (executive / faculty_admin / eila_admin)
└── ไม่มี → Auto-create / Update ข้อมูลจาก PSU
            (role: student / teacher / staff, faculty จาก PSU)
```

### 3.3 Session Management (NEW)

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

### 3.4 Token Refresh Strategy (NEW)

**FR-AUTH04: Token Expiry Handling**
- PSU Passport Access Token มีอายุ 30 นาที
- ระบบใช้ Refresh Token เพื่อขอ Access Token ใหม่ (ถ้า PSU รองรับ)
- ถ้าไม่มี Refresh Token → ให้ user Login ใหม่
- ถ้า Token หมดอายุระหว่างใช้งาน → บันทึก state ไว้ และ redirect ไป Login

**FR-AUTH05: PSU Passport Fallback**
- ถ้า PSU Passport ไม่ส่ง faculty_id (กรณีพิเศษ) → ใช้ default faculty "PSU" หรือให้ user เลือก faculty
- ถ้า PSU Passport ไม่ส่ง role → default เป็น "student"
- บันทึก error ลง audit log เพื่อติดตามปัญหา

---

## 4. Functional Requirements

### 4.1 Form Builder (Form-first แบบ Google Forms)

- **FR-F01** Admin สร้างฟอร์มใหม่แบบเปล่าได้ โดยไม่ต้องมี Template
- **FR-F02** รองรับการ Drag & Drop เพื่อเรียงลำดับคำถาม
- **FR-F03** สามารถเพิ่ม / ลบ / แก้ไขคำถามใน Form ได้
- **FR-F04** สามารถกำหนด URL เว็บไซต์ที่ต้องการประเมินได้
- **FR-F05** สามารถกำหนด Role ที่จะรับฟอร์มได้ (เลือกได้หลาย Role) เฉพาะ `faculty` scope
- **FR-F06** สามารถเปิด / ปิดฟอร์มได้ตลอดเวลา
- **FR-F07** ฟอร์มมีสถานะ 3 สถานะ ได้แก่ `draft` / `open` / `closed`
- **FR-F08** สามารถ Copy ฟอร์มเก่าไปสร้างใหม่และแก้ไขได้

#### Form Scope (Clarified)

- **FR-F09** ฟอร์มมี Scope 2 แบบ

| Scope | สร้างโดย | ใครเห็น | target_roles |
|-------|---------|--------|-------------|
| `faculty` | faculty_admin หรือ eila_admin | เฉพาะ Role ที่กำหนด ใน Faculty นั้น | ✅ ใช้ |
| `university` | eila_admin เท่านั้น | ทุก Role ทุก Faculty ทั้งหมด | ❌ ไม่ใช้ (เห็นหมดเลย) |

- **FR-F10** faculty_admin สร้างได้เฉพาะ `faculty` scope **(ไม่สามารถสร้าง university scope ได้)**
- **FR-F11** eila_admin สร้างได้ทั้ง `faculty` scope และ `university` scope
- **FR-F12** ฟอร์ม `university` scope ไม่มี `form_target_roles` — Respondent ทุก Role ทุก Faculty เห็นทั้งหมด

**Form Visibility Logic (Pseudocode):**

```typescript
function canUserSeeForm(user, form): boolean {
  if (form.scope === 'university') {
    return true // ทุก Role ทุก Faculty เห็นหมด
  }
  
  if (form.scope === 'faculty') {
    // faculty_admin เห็นฟอร์มของ Faculty ตัวเองเสมอ
    if (user.role === 'faculty_admin' && user.faculty_id === form.faculty_id) {
      return true
    }
    
    // Respondent เห็นฟอร์มถ้า match faculty_id AND role
    if (user.faculty_id === form.faculty_id) {
      const targetRoles = getFormTargetRoles(form.id) // ดึงจาก form_target_roles table
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
- **FR-F17** `open_at` และ `close_at` เป็น Optional — ถ้าไม่กำหนด Admin ต้องเปิด/ปิดเอง

#### Status Flow (Clarified)

```
draft ⇄ open → closed
↑      |
└──────┘ (เปิดใหม่ได้)

draft  → open   ✅ (กดเอง หรือระบบเปิดอัตโนมัติตาม open_at)
open   → draft  ✅ (ดึงกลับมาแก้ไข)
open   → closed ✅ (กดเอง หรือระบบปิดอัตโนมัติตาม close_at)
closed → open   ✅ (เปิดรอบใหม่ หรือขยายเวลา)

ถ้าฟอร์ม closed → Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
```

**closed → open ใหม่:**
- ไม่ลบ responses เก่า (เก็บไว้ทั้งหมด)
- Respondent สามารถ update response เดิมได้ (Upsert)
- ถ้าเคยตอบแล้ว → แสดงคำตอบเดิมให้แก้ไข
- ถ้ายังไม่เคยตอบ → แสดงฟอร์มเปล่า

#### Concurrent Form Editing (NEW - M4)

**FR-F18: Optimistic Locking**
- ฟอร์มทุกฟอร์มมี `version` field (integer, เริ่มที่ 1)
- เมื่อ Admin แก้ไขฟอร์มและบันทึก ระบบจะตรวจสอบว่า `version` ใน DB ตรงกับที่ client ส่งมาหรือไม่
- **ถ้าตรงกัน:** บันทึกสำเร็จ + เพิ่ม `version` ขึ้น 1
- **ถ้าไม่ตรงกัน:** แสดง warning "มีคนอื่นแก้ไขฟอร์มนี้ขณะที่คุณกำลังแก้ไขอยู่" + แสดง diff การเปลี่ยนแปลง + ให้เลือกว่าจะ:
  - **ทับ (Overwrite):** บันทึกทับการเปลี่ยนแปลงของคนอื่น (ต้องยืนยันอีกครั้ง)
  - **ยกเลิก (Cancel):** ยกเลิกการแก้ไข และโหลดข้อมูลล่าสุด

---

### 4.2 Template System

- **FR-T01** Admin สามารถสร้าง Template ชุดคำถามสำเร็จรูปได้
- **FR-T02** Template มี Scope 2 แบบ

| Scope | สร้างโดย | ใครเห็น |
|-------|---------|--------|
| `faculty` | faculty_admin หรือ eila_admin | เฉพาะ Faculty ตัวเอง |
| `global` | eila_admin เท่านั้น | ทุก Faculty ใช้ได้ |

- **FR-T03** faculty_admin **เห็นเฉพาะ Template ของ Faculty ตัวเอง + Template `global`** ไม่เห็น Template ของ Faculty อื่น
  - **Clarified:** Template ที่เห็น = `scope='global'` OR `(scope='faculty' AND faculty_id = user.faculty_id)`
- **FR-T04** การแชร์ Template ระหว่าง Faculty ต้องทำผ่าน **Export JSON → Import** เท่านั้น **(manual process, ไม่มี auto-share)**
- **FR-T05** เมื่อ Admin เลือก Template มาสร้างฟอร์ม ระบบจะ Clone คำถามทั้งหมดเข้า `form_questions` ทันที
- **FR-T06** คำถามที่ Clone มาสามารถแก้ไขได้อิสระ ไม่กระทบ Template ต้นฉบับ
- **FR-T07** Admin สามารถแก้ไข / ลบ Template ของตัวเองได้

---

### 4.3 ประเภทคำถาม (Question Types)

- **FR-Q01** Rating Scale (1–5 ดาว)
- **FR-Q02** Short Text (ข้อความสั้น / ความคิดเห็น)
- **FR-Q03** สามารถกำหนดได้ว่าคำถามข้อนั้นบังคับตอบหรือไม่
- **FR-Q04** สามารถเรียงลำดับคำถามได้อิสระด้วย Drag & Drop

---

### 4.4 Import / Export

#### 📤 Export โครงสร้างฟอร์ม
- **FR-IE01** Admin สามารถ Export โครงสร้างฟอร์มออกเป็นไฟล์ `.json` ได้
- **FR-IE02** ไฟล์ `.json` ที่ Export มีเฉพาะโครงสร้างคำถาม ไม่มีคำตอบของ User
- **FR-IE03** โครงสร้าง JSON มาตรฐาน ดูที่หัวข้อ 7

#### 📥 Import ฟอร์ม
- **FR-IE04** Admin สามารถ Import ไฟล์ `.json` เพื่อนำคำถามเข้าฟอร์มได้
- **FR-IE05** ระบบ Preview รายการคำถามที่จะ Import ให้ Admin ยืนยันก่อนเสมอ
- **FR-IE06** หากฟอร์มมีคำถามอยู่แล้ว ระบบถามว่า **"เพิ่มต่อท้าย"** หรือ **"แทนที่ทั้งหมด"**
- **FR-IE07** รองรับไฟล์ `.json` จากระบบอื่นที่ไม่ใช่ eila **หาก Format ถูกต้องตาม Validation Rules ในหัวข้อ 7.2**
  - **Clarified:** JSON ต้องมี `questions` array ที่มี fields ที่จำเป็น: `question_text`, `question_type`
  - Optional fields: `order`, `required` (default = false)
- **FR-IE08** หาก Format ผิด ระบบแจ้ง Error พร้อมระบุว่าผิดตรงไหน
- **FR-IE09** คำถามที่ Import มาแล้วสามารถแก้ไข / ลบ / เรียงลำดับใหม่ได้อิสระ

#### 📤 Export ผลลัพธ์
- **FR-IE10** Admin และ Executive สามารถ Export ผลลัพธ์เป็น `.pdf` ได้
- **FR-IE11** Admin และ Executive สามารถ Export ผลลัพธ์เป็น `.xlsx` ได้

---

### 4.5 การตอบฟอร์ม (Response)

- **FR-R01** Respondent เห็นฟอร์มที่ถูกกำหนดให้ Role และ Faculty ตัวเอง รวมถึงฟอร์ม `university` scope ทุกชิ้น
  - **Clarified:** Respondent เห็นฟอร์มหาก:
    1. `form.scope = 'university'` ทั้งหมด หรือ
    2. `form.scope = 'faculty'` AND `form.faculty_id = user.faculty_id` AND `user.role IN form_target_roles`
- **FR-R02** แสดงสถานะฟอร์ม: `ยังไม่ตอบ` / `ตอบแล้ว` / `หมดเวลาแล้ว`
- **FR-R03** Respondent สามารถแก้ไขคำตอบได้จนกว่าฟอร์มจะ `closed`
- **FR-R04** เมื่อฟอร์ม `closed` Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
- **FR-R05** ระบบเก็บเฉพาะคำตอบล่าสุด (Upsert) ไม่เก็บ History การแก้ไข
  - **Clarified:** Upsert = UPDATE ถ้ามีอยู่แล้ว, INSERT ถ้ายังไม่มี
  - **Audit Trail:** การแก้ไขทุกครั้งถูกบันทึกใน `audit_logs` table
- **FR-R06** Respondent ไม่สามารถเห็นคำตอบของคนอื่นได้
- **FR-R07** ระบบป้องกันการส่งซ้ำด้วย `UNIQUE (form_id, user_id)` ใน responses table

---

### 4.6 Dashboard & Analytics

- **FR-D01** faculty_admin ดูผลลัพธ์ได้เฉพาะฟอร์มใน Faculty ตัวเอง
- **FR-D02** eila_admin และ executive ดู Dashboard ได้ทุกฟอร์มทุก Faculty
- **FR-D03** แสดงคะแนนเฉลี่ยของแต่ละคำถาม
- **FR-D04** แสดงกราฟสรุปผลภาพรวม (Bar Chart คะแนน, สรุป Short Text)
  - **Clarified:** Bar chart sorted by count descending, max 20 bars
  - Short text: max 100 comments, sorted by recency
- **FR-D05** แสดงจำนวนผู้ตอบทั้งหมด และ % ของผู้ที่ยังไม่ตอบ
  - **Clarified:** `% = (respondents_who_answered / total_form_target_roles) × 100`
  - `total_form_target_roles` = จำนวนผู้ใช้ทั้งหมดที่มี role ตรงกับ `form_target_roles` ใน Faculty นั้น
- **FR-D06** แสดงความคิดเห็น (Short Text) ทั้งหมด

---

### 4.7 User Management

- **FR-U01** eila_admin สามารถเพิ่ม / ลบ / แก้ไข faculty_admin และ executive ได้
  - **Clarified:** "ลบ" = soft delete (mark inactive), ไม่ hard delete
  - **Clarified:** รองรับ bulk operations (XLSX import)
  - **Clarified:** ทุก query ต้อง filter `WHERE is_active = true` เพื่อไม่แสดง soft deleted records
- **FR-U02** eila_admin กำหนด Faculty ให้ faculty_admin ได้ (เลือกจาก `faculties` table)
- **FR-U03** eila_admin จัดการ `faculties` table ได้ (เพิ่ม / ลบ / แก้ไขคณะ)
  - **Clarified:** "ลบ" Faculty = soft delete, ไม่ลบถ้ามี user/form อยู่
- **FR-U04** eila_admin ดูภาพรวมผู้ใช้งานทั้งระบบได้

---

### 4.8 Notification System (Phase 2)

ช่องทาง: **Email (SMTP PSU) + In-app (ไอคอนระฆังในระบบ)**

| รหัส | เหตุการณ์ | ผู้รับ | ช่องทาง |
|---|---|---|---|
| FR-N01 | Admin เผยแพร่ฟอร์ม (status → `open`) | Respondent ที่เกี่ยวข้องทุกคน | Email + In-app |
| FR-N02 | เหลือ 3 วันก่อนปิด + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N03 | เหลือ 1 วันก่อนปิด + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N04 | Admin ขยายเวลา (close_at ถูกแก้ไข) | Respondent ที่เกี่ยวข้องทุกคน | Email + In-app |
| FR-N05 | Respondent ส่งฟอร์มสำเร็จ | Respondent คนนั้น | In-app เท่านั้น |
| FR-N06 | ฟอร์ม closed อัตโนมัติตาม Scheduler | faculty_admin เจ้าของฟอร์ม | In-app เท่านั้น |

- **FR-N07** In-app Notification แสดงเป็นไอคอนระฆัง บอกจำนวนที่ยังไม่อ่าน
- **FR-N08** ผู้ใช้สามารถกด Mark as Read ได้
- **FR-N09** Email แจ้งเตือนมีลิงก์ตรงไปยังฟอร์มนั้น

**Clarified Timing (FR-N02, FR-N03):**
- Reminder ส่งที่เวลา **9:00 AM PSU timezone (UTC+7)**
- "3 วัน" = close_at minus 72 ชั่วโมง
- "1 วัน" = close_at minus 24 ชั่วโมง

**Email Failure Handling (NEW - M10):**
- **FR-N10** ถ้า Email ส่งไม่สำเร็จ:
  - Retry 3 ครั้งด้วย exponential backoff (1 นาที, 5 นาที, 15 นาที)
  - บันทึก error ลง `notification_logs` table
  - ถ้า retry ครบ 3 ครั้งแล้วยังไม่สำเร็จ → แจ้ง admin ผ่าน in-app

---

### 4.9 Error Handling (NEW - M1)

**FR-ERR01: Input Validation**
- ระบบต้อง validate ทุก user input ก่อนประมวลผล
- Form input validation:
  - Form title: required, max 200 characters
  - Question text: required, max 1000 characters
  - Website URL: must be valid URL format
  - Rating value: integer 1-5
- Error response format:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "details": [
        { "field": "title", "message": "Title is required" }
      ]
    }
  }
  ```

**FR-ERR02: Timeout Handling**
- API request timeout: 30 วินาที
- ถ้า PSU Passport timeout → แสดงข้อความ "ไม่สามารถเชื่อมต่อระบบ PSU ได้ กรุณาลองใหม่อีกครั้ง"
- ระบบ retry PSU Passport API 3 ครั้งก่อนแจ้ง error

**FR-ERR03: JSON Import Error Handling**
- ระบบต้อง validate JSON format ก่อน import
- Error messages ต้องระบุชัดเจนว่าผิดตรงไหน:
  - `"questions ต้องเป็น Array"`
  - `"question_text ข้อที่ 3 ว่างเปล่า"`
  - `"question_type ข้อที่ 5 ไม่ถูกต้อง (ต้องเป็น rating หรือ short_text)"`

---

### 4.10 Audit Logging (NEW - M3)

**FR-U05: Audit Log**
- ระบบบันทึกทุกการเปลี่ยนแปลงที่สำคัญ:
  - สร้าง / แก้ไข / ลบ ฟอร์ม
  - สร้าง / แก้ไข / ลบ Template
  - เปลี่ยน role ของ user
  - เพิ่ม / ลบ / แก้ไข Faculty
  - Login / Logout
  - Export ข้อมูล (PDF / Excel / JSON)
- Audit log เก็บข้อมูล:
  - `user_id` — ใครทำ
  - `action` — ทำอะไร (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT)
  - `entity_type` — ประเภท (FORM, TEMPLATE, USER, FACULTY)
  - `entity_id` — ID ของสิ่งที่ถูกทำ
  - `old_value` — ค่าเดิม (JSON)
  - `new_value` — ค่าใหม่ (JSON)
  - `ip_address` — IP address
  - `timestamp` — เวลาที่ทำ
- eila_admin สามารถดู Audit Log ของทั้งระบบได้
- Audit log เก็บไว้ 1 ปี

---

## 5. Non-Functional Requirements

### 5.1 General

- **NFR-01** Phase 1 ใช้ Single Role ต่อ User (Enum) รองรับ Multi-role ในอนาคต โดย Migrate เป็น `user_roles` table
- **NFR-02** ระบบต้องรองรับการใช้งานบน Mobile (Responsive)
  - **Clarified:** Support breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop)
  - Test on Safari iOS 13+, Chrome Android 8+
- **NFR-03** ระบบต้องมีการตรวจสอบสิทธิ์ทุก API Request (Authorization)
  - **Clarified:** ทุก API ต้อง auth ยกเว้น:
    - `GET /api/health` — health check
    - `GET /api/forms/:id/public` — ฟอร์ม public (ถ้ามี)
- **NFR-04** ข้อมูลคำตอบต้องถูกต้องและ Tamper-proof
  - **Clarified:** ใช้ Audit Log track ทุกการเปลี่ยนแปลง (ไม่ลบคำตอบเดิม)
- **NFR-05** ระบบต้องรองรับ Admin หลายคนพร้อมกัน
  - **Clarified:** รองรับ ≥ 10 concurrent admin users แก้ไขฟอร์มต่างกันได้
  - ฟอร์มเดียวกัน → ใช้ Optimistic Locking (FR-F18)
- **NFR-06** ไฟล์ Import ต้องผ่านการ Validate Format ก่อนนำเข้าระบบเสมอ
  - **Clarified:** Max file: 5 MB, max 500 questions, max text 500 chars
- **NFR-07** ระบบต้องมี Scheduler (Cron Job) สำหรับเปลี่ยน Status ฟอร์มอัตโนมัติตาม `open_at` / `close_at`
  - **Clarified:** Scheduler ตรวจสอบทุก 1-5 นาที
  - Acceptance: 98% ของฟอร์มเปลี่ยน status ภายใน 5 นาทีของเวลา trigger
- **NFR-08** ระบบต้องมี Scheduler สำหรับตรวจสอบและส่ง Notification เตือนก่อนปิดฟอร์ม (ทุก 1 ชั่วโมง)
  - **Clarified:** Scheduler รันทุก 1 ชั่วโมง ที่เวลา 00 นาที
- **NFR-09** faculty_admin ต้องไม่สามารถเข้าถึงข้อมูล Faculty อื่นได้ผ่านทุก API
  - **Clarified:** ทุก API query ต้อง filter by `user.faculty_id` (defense in depth)

### 5.2 Data Retention & Backup (NEW - M5, M6)

- **NFR-10: Data Retention**
  - ข้อมูลฟอร์มและคำตอบที่เก่ากว่า 2 ปี ต้องถูก archive
  - Archive = ย้ายข้อมูลไป archive table / cold storage
  - ข้อมูลใน archive ยังสามารถดูได้ แต่ไม่แสดงใน dashboard ปกติ
  - ข้อมูลที่เก่ากว่า 5 ปี → ลบได้ (ตามนโยบายมหาวิทยาลัย)
  - **Implementation:** Scheduler รันทุกวันที่ 02:30 น. ตรวจสอบและ archive ข้อมูลอัตโนมัติ
  - **Archive tables:** `forms_archive`, `responses_archive`, `answers_archive` (โครงสร้างเหมือน table ต้นฉบับ)

- **NFR-11: Backup & Recovery**
  - Database backup ทุกวัน เวลา 02:00 น.
  - Backup เก็บไว้ 7 วัน
  - Recovery time objective (RTO): < 1 ชั่วโมง
  - Recovery point objective (RPO): < 24 ชั่วโมง
  - **Disaster Recovery Plan:**
    - Backup เก็บ off-site (ต่าง physical location)
    - ทดสอบ recovery ทุกเดือน
    - มี runbook สำหรับ emergency recovery
    - แจ้งเตือนเมื่อ backup ล้มเหลว

### 5.3 Form Versioning (NEW - M7)

- **NFR-12: Form Versioning**
  - ระบบเก็บประวัติการเปลี่ยนแปลงโครงสร้างฟอร์ม
  - ทุกครั้งที่มีการเพิ่ม/ลบ/แก้ไขคำถามในฟอร์ม → สร้าง version ใหม่
  - Version เก็บ:
    - `form_id` — FK → forms
    - `version` — integer (1, 2, 3, ...)
    - `questions_snapshot` — JSON snapshot ของคำถาม ณ เวลานั้น
    - `changed_by` — FK → users
    - `changed_at` — timestamp
  - Admin สามารถดู version history ของฟอร์มได้
  - Admin สามารถ rollback ไป version เก่าได้ (create new form จาก version เก่า)

### 5.4 API Documentation (NEW - M8)

- **NFR-13: OpenAPI Specification**
  - ระบบต้องมี OpenAPI 3.0 specification สำหรับทุก REST API
  - API docs เข้าถึงได้ที่ `/api/docs` (Swagger UI)
  - API spec update อัตโนมัติเมื่อ code เปลี่ยน

### 5.5 Performance (NEW - M9)

- **NFR-14: Performance Targets**
  - API response time < 500ms สำหรับ 95th percentile
  - รองรับ 1000 concurrent users
  - Dashboard load time < 2 วินาที
  - Form submit < 1 วินาที

---

## 6. Security Requirements (NEW)

### 6.1 Transport Security

**NFR-SEC01: HTTPS/TLS**
- ทุกการสื่อสารต้องใช้ HTTPS ด้วย TLS 1.2 ขึ้นไป
- Frontend ↔ Backend: HTTPS
- Backend ↔ PSU Passport: HTTPS
- Backend ↔ Database: SSL/TLS (ถ้า PostgreSQL รองรับ)

### 6.2 Authentication Security

**NFR-SEC02: CSRF Protection**
- Implement CSRF tokens สำหรับทุก POST/PUT/DELETE request
- ใช้ SameSite=Strict cookies
- CSRF token ต้อง validate ที่ server side

**NFR-SEC07: Session Security**
- Session cookies ต้องมี:
  - Secure flag (ส่งผ่าน HTTPS เท่านั้น)
  - HttpOnly flag (JavaScript เข้าถึงไม่ได้)
  - SameSite=Strict
- Session ID ต้องสุ่มด้วย cryptographic random

**NFR-SEC10: OAuth Security**
- Implement OAuth 2.0 PKCE flow
- Validate state parameter ป้องกัน CSRF
- Verify JWT signature (ถ้า PSU ใช้ JWT)
- Token ต้องเก็บใน secure storage

### 6.3 Input/Output Security

**NFR-SEC03: XSS Prevention**
- ทุก user input ต้อง sanitize/escape ก่อน output
- ใช้ React/Next.js built-in escaping
- ไม่ใช้ `dangerouslySetInnerHTML` นอกจากจำเป็นและ sanitize แล้ว
- Content Security Policy (CSP) header

**NFR-SEC04: SQL Injection Prevention**
- ใช้ parameterized queries / ORM (Prisma/Sequelize) สำหรับทุก database operation
- ห้าม string concatenation ใน query
- Validate ทุก input ก่อนใช้ query

**NFR-SEC06: File Upload Security**
- Validate file type: JSON เท่านั้น (ตรวจสอบ Content-Type และ file magic number)
- Max file size: 5 MB
- Scan for malicious content (ClamAV หรือ AWS Lambda scan)
- เก็บไฟล์นอก web root
- ลบไฟล์ทันทีหลังประมวลผลเสร็จ

### 6.4 API Security

**NFR-SEC05: Rate Limiting**
- Rate limit: 100 requests/min per IP
- Rate limit: 50 requests/min per user
- Login endpoint: 5 attempts/min per IP (ป้องกัน brute force)
- Rate limit response: HTTP 429 Too Many Requests

**NFR-SEC08: Faculty-Level Authorization**
- ทุก API query ต้อง filter by `user.faculty_id`
- Defense in depth: validate ที่ middleware AND ที่ query
- faculty_admin ต้องไม่สามารถ access form/template ของ Faculty อื่นได้

### 6.5 Audit & Monitoring

**NFR-SEC09: Audit Logging**
- Log ทุก admin action: create/update/delete forms, templates, users, faculties
- Log ทุก login/logout
- เก็บ log ไว้ 1 ปี
- Audit log ต้อง tamper-proof (write-only, ไม่แก้ไขได้)
- **Implementation:** ใช้ append-only table, ไม่มี UPDATE/DELETE permission สำหรับ audit_logs table
- **Implementation:** ใช้ cryptographic hash chain (SHA-256) เพื่อตรวจสอบการแก้ไข

**NFR-SEC11: Encryption at Rest**
- Encrypt sensitive fields ที่ database:
  - Email (AES-256)
  - Responses (optional, AES-256)
- Database encryption at rest (ถ้า hosting รองรับ)

**NFR-SEC12: Security Monitoring**
- Monitor security events:
  - Failed login attempts (>5/min → alert)
  - API errors (spike ใน error rate)
  - Unusual query patterns (SQL injection attempt)
- Alert ผ่าน email / line notify

### 6.6 Role Override Security (Clarified - S11)

**FR-U06: Role Override**
- เฉพาะ eila_admin สามารถ override role ได้
- Role override ต้องมี 2FA verification
- ทุก role override ถูกบันทึกใน audit log
- User ที่ถูก override role จะได้รับ notification

---

## 7. Database Schema

### faculties
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| name_th | String | ชื่อคณะภาษาไทย |
| name_en | String | ชื่อคณะภาษาอังกฤษ |
| is_active | Boolean | Soft delete (default: true) |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### users
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| psu_passport_id | String | UNIQUE — ID จาก PSU Passport |
| name | String | ชื่อ-นามสกุล |
| email | String | อีเมลมหาวิทยาลัย (encrypted at rest) |
| role | Enum | eila_admin / faculty_admin / executive / teacher / staff / student |
| faculty_id | UUID | FK → faculties (NULL สำหรับ eila_admin) |
| is_active | Boolean | Soft delete (default: true) |
| last_login_at | DateTime | ครั้งล่าสุดที่ login |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### templates
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| name | String | ชื่อ Template |
| description | String | คำอธิบาย |
| scope | Enum | `faculty` / `global` |
| faculty_id | UUID | FK → faculties (NULL ถ้า scope = global) |
| created_by | UUID | FK → users |
| created_at | DateTime | วันที่สร้าง |

> **หมายเหตุ:** `scope = global` สร้างได้เฉพาะ eila_admin เท่านั้น / `scope = faculty` → faculty_admin เห็นได้เฉพาะ Faculty ตัวเอง

### template_questions
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| template_id | UUID | FK → templates |
| question_text | String | ข้อคำถาม |
| question_type | Enum | rating / short_text |
| order | Integer | ลำดับ |
| required | Boolean | บังคับตอบ |
| created_at | DateTime | วันที่สร้าง |

### forms
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| title | String | ชื่อฟอร์ม |
| website_url | String | URL เว็บที่ประเมิน |
| scope | Enum | `faculty` / `university` |
| faculty_id | UUID | FK → faculties (NULL ถ้า scope = university) |
| template_id | UUID | FK → templates (NULLABLE) |
| copied_from | UUID | FK → forms (NULLABLE) |
| imported_from | String | ชื่อไฟล์ที่ Import มา (NULLABLE) |
| status | Enum | draft / open / closed |
| open_at | DateTime | เวลาเปิดอัตโนมัติ (NULLABLE) |
| close_at | DateTime | เวลาปิดอัตโนมัติ (NULLABLE) |
| version | Integer | Optimistic locking (default: 1) |
| created_by | UUID | FK → users |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### form_questions
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| question_text | String | ข้อคำถาม |
| question_type | Enum | rating / short_text |
| order | Integer | ลำดับ (Drag & Drop) |
| required | Boolean | บังคับตอบ |
| created_at | DateTime | วันที่สร้าง |

> **หมายเหตุ:** คำถามทุกข้ออยู่ใน `form_questions` เสมอ ไม่ว่าจะสร้างเอง / Clone จาก Template / Import จาก JSON การแก้ไขใน `form_questions` ไม่กระทบ Template ต้นฉบับ

### form_target_roles
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| role | Enum | teacher / staff / student |

> **หมายเหตุ:** ใช้เฉพาะฟอร์ม `scope = faculty` เท่านั้น — ฟอร์ม `scope = university` ไม่มี record ใน table นี้ เพราะทุก Role ทุก Faculty เห็นหมด

### responses
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| user_id | UUID | FK → users |
| submitted_at | DateTime | วันที่ส่งครั้งแรก |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

> **Constraint:** `UNIQUE (form_id, user_id)` — ป้องกัน User ส่งซ้ำในฟอร์มเดียวกัน

### answers
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| response_id | UUID | FK → responses |
| question_id | UUID | FK → form_questions |
| rating_value | Integer | ถ้าเป็น Rating (1–5) |
| text_value | String | ถ้าเป็น Short Text |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

> **Constraint:** `UNIQUE (response_id, question_id)` — รองรับ Upsert เก็บเฉพาะคำตอบล่าสุด

### notifications *(Phase 2)*
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| user_id | UUID | FK → users |
| type | Enum | form_opened / reminder_3d / reminder_1d / deadline_extended / submitted / form_closed |
| form_id | UUID | FK → forms |
| message | String | ข้อความแจ้งเตือน |
| is_read | Boolean | อ่านแล้วหรือยัง |
| created_at | DateTime | วันที่สร้าง |

### audit_logs (NEW)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| user_id | UUID | FK → users |
| action | Enum | CREATE / UPDATE / DELETE / LOGIN / LOGOUT / EXPORT |
| entity_type | Enum | FORM / TEMPLATE / USER / FACULTY / RESPONSE |
| entity_id | UUID | ID ของ entity ที่ถูกทำ |
| old_value | JSON | ค่าเดิม (ก่อนแก้ไข) |
| new_value | JSON | ค่าใหม่ (หลังแก้ไข) |
| ip_address | String | IP address |
| created_at | DateTime | วันที่ทำ |

### form_versions (NEW)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| version | Integer | Version number (1, 2, 3, ...) |
| questions_snapshot | JSON | Snapshot ของคำถาม |
| changed_by | UUID | FK → users |
| changed_at | DateTime | วันที่แก้ไข |

### notification_logs (NEW)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| notification_id | UUID | FK → notifications |
| attempt | Integer | ครั้งที่ retry (1, 2, 3) |
| status | Enum | success / failed |
| error_message | String | Error message (ถ้า failed) |
| created_at | DateTime | วันที่ลองส่ง |

### Recommended Indexes (NEW)

| Table | Index | Purpose |
|-------|-------|---------|
| `forms` | `idx_forms_faculty_id` | Filter by faculty |
| `forms` | `idx_forms_scope_faculty` | Composite index for form visibility (scope, faculty_id) |
| `form_target_roles` | `idx_form_target_roles_form_id` | Join query |
| `form_target_roles` | `idx_form_target_roles_role` | Filter by role |
| `audit_logs` | `idx_audit_logs_user_id` | Audit trail by user |
| `audit_logs` | `idx_audit_logs_entity` | Entity history (entity_type, entity_id) |
| `audit_logs` | `idx_audit_logs_created_at` | Time-based queries |
| `responses` | `idx_responses_form_user` | UNIQUE constraint already covers this |
| `users` | `idx_users_faculty_id` | Filter by faculty |
| `users` | `idx_users_psu_passport` | Login lookup |

---

## 8. Import/Export JSON Specification

### 8.1 โครงสร้าง JSON มาตรฐาน

```json
{
  "eila_schema_version": "1.0",
  "form_title": "ชื่อฟอร์ม",
  "exported_at": "2026-04-23T10:00:00Z",
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

> **หมายเหตุ:** ใช้ `eila_schema_version` แยกจาก SRS Version — อัปเดตเฉพาะเมื่อโครงสร้าง JSON เปลี่ยนแปลงเท่านั้น

### 8.2 Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| questions | ต้องเป็น Array | "questions ต้องเป็น Array" |
| question_text | ต้องมีค่า ไม่ว่าง | "question_text ข้อที่ N ว่างเปล่า" |
| question_type | ต้องเป็น rating หรือ short_text | "question_type ข้อที่ N ไม่ถูกต้อง (ต้องเป็น rating หรือ short_text)" |
| required | ต้องเป็น boolean | "required ข้อที่ N ต้องเป็น true/false" |
| order | ต้องเป็น Integer | "order ข้อที่ N ต้องเป็นตัวเลข" |
| file size | Max 5 MB | "ไฟล์ใหญ่เกิน 5 MB" |
| questions count | Max 500 | "คำถามเกิน 500 ข้อ" |
| text length | Max 1000 chars per question | "question_text ข้อที่ N ยาวเกิน 1000 ตัวอักษร" |

### 8.3 Import Conflict Flow

```
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

---

## 9. หน้าเว็บ (Pages)

### ทั่วไป
| Path | คำอธิบาย |
|------|---------|
| `/` | Landing Page + ปุ่ม Login |
| `/auth/callback` | PSU Passport OAuth Callback |

### eila_admin
| Path | คำอธิบาย |
|------|---------|
| `/eila-admin/dashboard` | ภาพรวมระบบทั้งหมดทุก Faculty |
| `/eila-admin/users` | จัดการผู้ใช้ทุก Role |
| `/eila-admin/faculties` | จัดการ Faculty (เพิ่ม / ลบ / แก้ไข) |
| `/eila-admin/forms` | รายการฟอร์มทั้งหมดทุก Faculty |
| `/eila-admin/forms/create` | สร้างฟอร์มใหม่ (เลือก scope ได้) |
| `/eila-admin/forms/[id]/edit` | แก้ไขฟอร์ม |
| `/eila-admin/forms/[id]/results` | ดูผลลัพธ์ + Export |
| `/eila-admin/templates` | รายการ Template ทั้งหมด (global + faculty) |
| `/eila-admin/audit-logs` | ดู Audit Log ทั้งระบบ (NEW) |

### faculty_admin
| Path | คำอธิบาย |
|------|---------|
| `/admin/dashboard` | สรุปภาพรวมฟอร์มของ Faculty ตัวเอง |
| `/admin/forms` | รายการฟอร์มของ Faculty ตัวเอง |
| `/admin/forms/create` | สร้างฟอร์มใหม่ (faculty scope เท่านั้น) |
| `/admin/forms/[id]/edit` | แก้ไขฟอร์ม + Drag & Drop + Import/Export + ตั้งเวลา |
| `/admin/forms/[id]/copy` | Copy ฟอร์มไปสร้างใหม่ |
| `/admin/forms/[id]/results` | ดูผลลัพธ์ + Export PDF/Excel |
| `/admin/templates` | Template ของ Faculty ตัวเอง + global |
| `/admin/templates/create` | สร้าง Template ใหม่ (faculty scope) |
| `/admin/templates/[id]/edit` | แก้ไข Template |

### executive
| Path | คำอธิบาย |
|------|---------|
| `/executive/dashboard` | Dashboard ทุกฟอร์มทุก Faculty |
| `/executive/forms/[id]/results` | ดูผลลัพธ์ + Export |

### Respondent
| Path | คำอธิบาย |
|------|---------|
| `/home` | รายการฟอร์มที่ได้รับ (faculty + university scope) พร้อม Status |
| `/forms/[id]` | หน้าตอบฟอร์ม (ถ้าตอบแล้ว → แสดงคำตอบเดิมให้แก้ไขได้) |
| `/forms/[id]/done` | หน้ายืนยันส่งแล้ว |

---

## 10. แผนการพัฒนา (Development Phases)

### Phase 1 — MVP
- [x] PSU Passport Login + Role Resolution + Auto-create User
- [x] 6 Role พร้อม Faculty Scope + NFR-09 (Data Isolation)
- [x] faculties table + eila_admin จัดการ Faculty
- [x] Form Builder แบบ Form-first (Drag & Drop)
- [x] Form Scope: faculty / university
- [x] Template Scope: faculty / global
- [x] Form Date: open_at / close_at + Auto-close Scheduler
- [x] Template System (Clone เข้า form_questions)
- [x] Copy ฟอร์มเก่า
- [x] Import / Export JSON (โครงสร้างฟอร์ม)
- [x] ตอบฟอร์มตาม Role + Scope + Status
- [x] UNIQUE Constraint ป้องกันส่งซ้ำ
- [x] ดูผล Dashboard แยก Faculty
- [ ] **NEW:** Optimistic Locking (FR-F18)
- [ ] **NEW:** Session Management (FR-AUTH01-04)
- [ ] **NEW:** Audit Logging (FR-U05)
- [ ] **NEW:** Error Handling (FR-ERR01-03)
- [ ] **NEW:** Security Requirements (NFR-SEC01-12)

### Phase 2 — ปรับปรุง
- [ ] Export PDF & Excel (ผลลัพธ์)
- [ ] กราฟ Analytics (Bar Chart, สรุป Short Text)
- [ ] Dashboard ผู้บริหาร (Executive)
- [ ] Notification System (Email + In-app)
- [ ] **NEW:** Form Versioning (NFR-12)
- [ ] **NEW:** Data Retention & Backup (NFR-10, NFR-11)

### Phase 3 — ขยาย
- [ ] เพิ่มประเภทคำถาม (ปรนัย / Dropdown)
- [ ] eila_admin Panel เต็มรูปแบบ
- [ ] ประวัติ / Audit Log (UI)
- [ ] Multi-role Support (Migrate user_roles table)
- [ ] **NEW:** API Documentation (NFR-13)
- [ ] **NEW:** Performance Optimization (NFR-14)

---

## 11. การแบ่งงาน (Team)

### คนที่ 1 — Backend + Auth
- [ ] ติดตั้ง Fastify + PostgreSQL
- [ ] เชื่อม PSU Passport OAuth + Role Resolution + Auto-create User
- [ ] **NEW:** Implement OAuth PKCE flow (NFR-SEC10)
- [ ] **NEW:** Implement Session Management (FR-AUTH01-04)
- [ ] API: faculties CRUD
- [ ] API: users / roles / permissions / faculty scope + Data Isolation (NFR-09)
- [ ] **NEW:** API: audit_logs CRUD
- [ ] API: forms CRUD + Scope Logic (faculty / university)
- [ ] **NEW:** API: forms optimistic locking
- [ ] API: templates CRUD + Scope Logic (faculty / global)
- [ ] API: template_questions / form_questions
- [ ] API: form_target_roles (เฉพาะ faculty scope)
- [ ] API: responses / answers (Upsert + UNIQUE Constraint)
- [ ] API: Import JSON (Validate + Insert into form_questions)
- [ ] API: Export JSON (Form Structure)
- [ ] Scheduler: Auto open/close ตาม open_at / close_at
- [ ] Scheduler: Notification trigger — Phase 2
- [ ] **NEW:** Error Handling (FR-ERR01-03)
- [ ] Export PDF (PDF-lib) + Excel (ExcelJS) — Phase 2
- [ ] Email Notification (Nodemailer) — Phase 2
- [ ] **NEW:** Email retry logic (FR-N10)
- [ ] ระบบสิทธิ์ทั้ง 6 Role พร้อม Faculty Scope
- [ ] **NEW:** Security: Rate Limiting (NFR-SEC05)
- [ ] **NEW:** Security: CSRF Protection (NFR-SEC02)

### คนที่ 2 — Frontend
- [ ] ติดตั้ง Next.js + Tailwind
- [ ] หน้า Login / PSU Passport Callback
- [ ] **NEW:** Session timeout warning UI
- [ ] Form Builder Drag & Drop (dnd-kit) + ตั้งเวลา open_at/close_at
- [ ] Form Scope Selector (faculty / university) — eila_admin เท่านั้น
- [ ] Template Scope แสดงผล (global badge / faculty badge)
- [ ] Import JSON: Upload → Validate Preview → Confirm Dialog
- [ ] Export JSON: ปุ่ม Export โครงสร้างฟอร์ม
- [ ] Template Picker & Clone
- [ ] Copy Form feature
- [ ] หน้าตอบฟอร์ม (Respondent) + Status + แสดงคำตอบเดิม
- [ ] Admin Dashboard + กราฟ (แยก Faculty)
- [ ] eila_admin หน้าจัดการ Faculty + Forms ทุก Faculty
- [ ] **NEW:** Audit Log Viewer (eila_admin)
- [ ] **NEW:** Optimistic locking conflict dialog
- [ ] **NEW:** Error message display (validation errors)
- [ ] Executive Dashboard — Phase 2
- [ ] In-app Notification (ระฆัง + Mark as Read) — Phase 2

---

## 12. Git Branch Strategy

### 12.1 โครงสร้าง Branch
```
main
└── develop
    ├── feature/backend-xxx   (คนที่ 1)
    ├── feature/frontend-xxx  (คนที่ 2)
    └── hotfix/xxx            (กรณี Bug เร่งด่วน)
```

| Branch | วัตถุประสงค์ | ใครใช้ | Merge ไปที่ |
|--------|------------|--------|------------|
| `main` | Production เท่านั้น | ทั้งคู่ (ตกลงกันก่อน) | — |
| `develop` | รวมงานล่าสุดก่อน Release | ทั้งคู่ | `main` |
| `feature/xxx` | งานแต่ละชิ้น | แต่ละคน | `develop` |
| `hotfix/xxx` | แก้ Bug เร่งด่วนบน Production | ทั้งคู่ | `main` และ `develop` |

**❌ ห้าม push ตรงเข้า main เด็ดขาด**

### 12.2 Hotfix Branch Strategy

ใช้เมื่อ: พบ Bug บน Production (main) ที่ต้องแก้ทันที ไม่สามารถรอ develop ได้

```bash
# 1. แตก hotfix จาก main โดยตรง
git checkout main
git pull origin main
git checkout -b hotfix/fix-form-status-bug

# 2. แก้บัค + commit
git add .
git commit -m "fix: form status not closing on close_at"

# 3. Merge กลับ main ก่อน (แก้ Production)
git checkout main
git merge hotfix/fix-form-status-bug
git tag -a v1.5.1 -m "hotfix: form status bug"
git push origin main --tags

# 4. Merge กลับ develop ด้วย (sync โค้ด)
git checkout develop
git merge hotfix/fix-form-status-bug
git push origin develop

# 5. ลบ hotfix branch
git branch -d hotfix/fix-form-status-bug
git push origin --delete hotfix/fix-form-status-bug
```

⚠️ ต้อง Merge กลับทั้ง main และ develop เสมอ มิเช่นนั้น develop จะขาด fix นี้ไปในรอบถัดไป

### 12.3 Feature Branches ตามแผนงาน

**คนที่ 1 — Backend**
```
feature/backend-setup
feature/backend-auth-psu
feature/backend-faculties-api
feature/backend-users-api
feature/backend-forms-api
feature/backend-templates-api
feature/backend-responses-api
feature/backend-import-export
feature/backend-scheduler
feature/backend-notifications      ← Phase 2
feature/backend-export-pdf-excel   ← Phase 2
feature/backend-audit-logging      ← NEW (v1.5)
feature/backend-session-mgmt       ← NEW (v1.5)
feature/backend-security           ← NEW (v1.5)
```

**คนที่ 2 — Frontend**
```
feature/frontend-setup
feature/frontend-login
feature/frontend-form-builder
feature/frontend-form-scope
feature/frontend-import-export-ui
feature/frontend-templates
feature/frontend-respondent
feature/frontend-admin-dashboard
feature/frontend-eila-admin
feature/frontend-executive-dashboard  ← Phase 2
feature/frontend-notifications         ← Phase 2
feature/frontend-audit-log-viewer      ← NEW (v1.5)
feature/frontend-session-timeout       ← NEW (v1.5)
```

### 12.4 Flow การทำงานประจำวัน

```bash
# 1. ดึง develop ล่าสุดก่อนเริ่มงาน
git checkout develop
git pull origin develop

# 2. สร้าง feature branch ใหม่
git checkout -b feature/backend-forms-api

# 3. ทำงาน + commit ระหว่างทาง
git add .
git commit -m "feat: add form CRUD endpoints"

# 4. push ขึ้น remote
git push origin feature/backend-forms-api

# 5. เปิด Pull Request → develop แล้วให้อีกคน Review
```

### 12.5 Commit Message Convention

| Prefix | ใช้เมื่อ | ตัวอย่าง |
|--------|---------|---------|
| `feat:` | เพิ่มฟีเจอร์ใหม่ | `feat: add PSU Passport OAuth flow` |
| `fix:` | แก้ Bug | `fix: form status not updating on close_at` |
| `hotfix:` | แก้ Bug เร่งด่วนบน Production | `hotfix: resolve duplicate response submission` |
| `chore:` | Config / Setup / Dependencies | `chore: setup Fastify with PostgreSQL` |
| `refactor:` | ปรับโค้ด ไม่เพิ่มฟีเจอร์ | `refactor: extract form validation to middleware` |
| `docs:` | แก้ไข Documentation | `docs: update SRS v1.5` |
| `style:` | แก้ไข UI / CSS เท่านั้น | `style: adjust form builder layout` |
| `security:` | Security-related changes | `security: add CSRF protection` |

### 12.6 Pull Request Rules

- ทุก `feature/xxx` ต้อง เปิด PR → `develop` เสมอ ไม่ merge เอง
- อีกคนต้อง Review และ Approve ก่อน Merge
- ถ้า Conflict ให้คน สร้าง PR เป็นคนแก้เอง
- `hotfix/xxx` ต้องเปิด PR 2 ใบ (→ main และ → develop)
- Merge `develop` → `main` ทำเมื่อ Phase เสร็จสมบูรณ์ เท่านั้น

---

## 13. Test Cases (NEW)

### 13.1 Authentication Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| AUTH-01 | PSU Passport Login | User auto-created with correct role + faculty |
| AUTH-02 | Session timeout after 30 min | User redirected to login |
| AUTH-03 | Logout clears session | User cannot access protected routes |
| AUTH-04 | Role override by eila_admin | User role updated + audit log created |

### 13.2 Form Visibility Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| FORM-VIS-01 | faculty form visible to same faculty | Respondent sees form |
| FORM-VIS-02 | faculty form not visible to other faculty | Respondent doesn't see form |
| FORM-VIS-03 | university form visible to all | All respondents see form |
| FORM-VIS-04 | faculty_admin sees only own faculty forms | Cannot see other faculty forms |

### 13.3 Security Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SEC-01 | CSRF token validation | Request without CSRF token rejected |
| SEC-02 | SQL injection attempt | Query parameterized, no injection |
| SEC-03 | XSS in form title | Title escaped on output |
| SEC-04 | Rate limiting | >100 req/min returns 429 |
| SEC-05 | faculty_admin access other faculty API | Returns 403 Forbidden |

### 13.4 Concurrent Editing Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CONC-01 | Two admins edit same form | Second save shows conflict dialog |
| CONC-02 | Optimistic locking version mismatch | Warning displayed with diff |

### 13.5 Scheduler Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| SCH-01 | Form opens at open_at | Status changes to 'open' within 5 min |
| SCH-02 | Form closes at close_at | Status changes to 'closed' within 5 min |
| SCH-03 | Reminder sent 3 days before | Email + in-app notification sent at 9 AM |

### 13.6 Email Failure Tests (NEW)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| EMAIL-01 | Email send fails first attempt | Retry after 1 minute |
| EMAIL-02 | Email send fails 3 times | Mark as failed + notify admin via in-app |
| EMAIL-03 | Email retry exponential backoff | Retry at 1min, 5min, 15min intervals |

### 13.7 Form Versioning Tests (NEW)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| VER-01 | Form structure change creates version | New record in form_versions table |
| VER-02 | Admin can view version history | List of versions with timestamps |
| VER-03 | Admin can rollback to old version | New form created from old snapshot |

### 13.8 Data Retention Tests (NEW)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| RET-01 | Data older than 2 years archived | Scheduler moves data to archive tables |
| RET-02 | Archived data still queryable | Can retrieve via admin interface |
| RET-03 | Data older than 5 years deletable | Soft delete or purge per policy |

### 13.9 Soft Delete Tests (NEW)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| DEL-01 | Deleted user has is_active=false | User cannot login but data preserved |
| DEL-02 | Queries filter inactive records | is_active=true applied automatically |
| DEL-03 | Faculty delete with existing forms | Delete blocked if forms exist |

---

## 14. Appendix

### 14.1 Form Visibility Pseudocode

```typescript
// Can user see this form?
function canUserSeeForm(user: User, form: Form): boolean {
  // eila_admin sees everything
  if (user.role === 'eila_admin') {
    return true
  }
  
  // executive sees everything
  if (user.role === 'executive') {
    return true
  }
  
  // university scope: everyone sees
  if (form.scope === 'university') {
    return true
  }
  
  // faculty scope: check faculty_id and role
  if (form.scope === 'faculty') {
    // faculty_admin sees own faculty forms
    if (user.role === 'faculty_admin' && user.faculty_id === form.faculty_id) {
      return true
    }
    
    // respondent: must match faculty AND role
    if (user.faculty_id === form.faculty_id) {
      const targetRoles = getFormTargetRoles(form.id)
      return targetRoles.includes(user.role)
    }
    
    return false
  }
  
  return false
}

// Can user edit this form?
function canUserEditForm(user: User, form: Form): boolean {
  // eila_admin can edit everything
  if (user.role === 'eila_admin') {
    return true
  }
  
  // faculty_admin can edit own faculty forms only
  if (user.role === 'faculty_admin') {
    return user.faculty_id === form.faculty_id
  }
  
  return false
}
```

### 14.2 API Error Response Schema

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

**Error Codes:**
- `VALIDATION_ERROR` — Input validation failed
- `UNAUTHORIZED` — Not logged in
- `FORBIDDEN` — No permission
- `NOT_FOUND` — Resource not found
- `CONFLICT` — Version conflict (optimistic locking)
- `RATE_LIMITED` — Too many requests
- `INTERNAL_ERROR` — Server error

### 14.3 Glossary

| Term | Definition |
|------|------------|
| PSU Passport | OAuth provider ของมหาวิทยาลัย |
| Faculty | คณะ/วิทยาลัย ในมหาวิทยาลัย |
| Respondent | ผู้ตอบแบบประเมิน (teacher/staff/student) |
| Form Scope | ขอบเขตการมองเห็นฟอร์ม (faculty/university) |
| Template Scope | ขอบเขตการมองเห็น template (faculty/global) |
| Optimistic Locking | Concurrent editing strategy ด้วย version number |
| Soft Delete | การ "ลบ" โดยแค่ mark is_active=false ไม่ลบข้อมูลจริง |

---

## 15. API Endpoints Specification (NEW)

### 15.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/auth/psu` | Redirect to PSU Passport OAuth | ❌ |
| GET | `/api/auth/callback` | OAuth callback handler | ❌ |
| POST | `/api/auth/logout` | Logout (clear session) | ✅ |
| GET | `/api/auth/me` | Get current user info | ✅ |

### 15.2 Forms

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/forms` | List forms (filtered by scope/role) | ✅ |
| GET | `/api/forms/:id` | Get form by ID | ✅ |
| POST | `/api/forms` | Create new form | ✅ |
| PUT | `/api/forms/:id` | Update form (with optimistic locking) | ✅ |
| DELETE | `/api/forms/:id` | Soft delete form | ✅ |
| POST | `/api/forms/:id/duplicate` | Copy form | ✅ |
| GET | `/api/forms/:id/versions` | Get form version history | ✅ |
| POST | `/api/forms/:id/restore` | Restore form from version | ✅ |

### 15.3 Responses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/forms/:id/responses` | List responses for a form | ✅ |
| POST | `/api/forms/:id/responses` | Submit response (Upsert) | ✅ |
| GET | `/api/responses/:id` | Get response by ID | ✅ |
| PUT | `/api/responses/:id` | Update response | ✅ |

### 15.4 Templates

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/templates` | List templates (faculty + global) | ✅ |
| POST | `/api/templates` | Create template | ✅ |
| PUT | `/api/templates/:id` | Update template | ✅ |
| DELETE | `/api/templates/:id` | Delete template | ✅ |

### 15.5 Admin (eila_admin only)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List all users | ✅ (eila_admin) |
| POST | `/api/admin/users` | Create user | ✅ (eila_admin) |
| PUT | `/api/admin/users/:id` | Update user (including role override) | ✅ (eila_admin) |
| DELETE | `/api/admin/users/:id` | Soft delete user | ✅ (eila_admin) |
| GET | `/api/admin/faculties` | List all faculties | ✅ (eila_admin) |
| POST | `/api/admin/faculties` | Create faculty | ✅ (eila_admin) |
| PUT | `/api/admin/faculties/:id` | Update faculty | ✅ (eila_admin) |
| DELETE | `/api/admin/faculties/:id` | Soft delete faculty | ✅ (eila_admin) |
| GET | `/api/admin/audit-logs` | List audit logs | ✅ (eila_admin) |

### 15.6 Export/Import

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/forms/:id/export` | Export form structure as JSON | ✅ |
| POST | `/api/forms/:id/import` | Import form structure from JSON | ✅ |
| GET | `/api/forms/:id/export/pdf` | Export results as PDF | ✅ |
| GET | `/api/forms/:id/export/xlsx` | Export results as Excel | ✅ |

### 15.7 Error Response Schema

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

**Error Codes:**
- `VALIDATION_ERROR` — Input validation failed
- `UNAUTHORIZED` — Not logged in
- `FORBIDDEN` — No permission
- `NOT_FOUND` — Resource not found
- `CONFLICT` — Version conflict (optimistic locking)
- `RATE_LIMITED` — Too many requests
- `INTERNAL_ERROR` — Server error

---

## สรุปการแก้ไขจาก SRS Review v1.4

### Missing Requirements (10 ข้อ) — ✅ แก้ไขครบ
- M1: Error Handling → FR-ERR01-03
- M2: Session Management → FR-AUTH01-04
- M3: Audit Logging → FR-U05 + audit_logs table
- M4: Concurrent Editing → FR-F18 (Optimistic Locking)
- M5: Data Retention → NFR-10
- M6: Backup/Recovery → NFR-11
- M7: Form Versioning → NFR-12 + form_versions table
- M8: API Documentation → NFR-13
- M9: Performance → NFR-14
- M10: Email Failure → FR-N10

### Ambiguous Requirements (8 ข้อ) — ✅ ชี้แจงครบ
- A1-A2: Faculty Scope Logic → Pseudocode + canUserSeeForm()
- A3: Template Scope → Clarified in FR-T03
- A4: JSON Format → Section 8.2 Validation Rules
- A5: Status Flow → Clarified closed→open behavior
- A6: User Management → Clarified soft delete + bulk ops
- A7: Concurrent Admin → NFR-05 clarified (≥10 users)
- A8: Reminder Timing → Clarified 9 AM UTC+7

### Conflicting Requirements (3 ข้อ) — ✅ แก้ไขครบ
- C1: faculty_admin scope → Clarified cannot create university scope
- C2: Template Sharing → Clarified manual Export/Import only
- C3: Tamper-proof vs Upsert → Audit log tracks all changes

### Untestable Requirements (7 ข้อ) — ✅ ทำให้ test ได้
- U1: Scheduler timing → 1-5 min + 98% within 5 min
- U2: Mobile responsive → Breakpoints 320/768/1024px
- U3: Chart details → Max 20 bars / 100 comments
- U4: Reminder timing → 9 AM UTC+7
- U5: Authorization scope → Whitelist public APIs
- U6: File validation → Max 5MB/500 questions/1000 chars
- U7: Percentage calculation → (answered / total_target_roles) × 100

### Security Gaps (14 ข้อ) — ✅ เพิ่มครบ
- S1: HTTPS → NFR-SEC01
- S2: CSRF → NFR-SEC02
- S3: XSS → NFR-SEC03
- S4: SQL Injection → NFR-SEC04
- S5: Rate Limiting → NFR-SEC05
- S6: File Upload → NFR-SEC06
- S7: Session Cookies → NFR-SEC07
- S8: Token Refresh → FR-AUTH04
- S9: Faculty Permission → NFR-SEC08
- S10: Audit Log → NFR-SEC09
- S11: Role Override → FR-U06
- S12: OAuth PKCE → NFR-SEC10
- S13: Encryption at Rest → NFR-SEC11
- S14: Monitoring → NFR-SEC12

---

**eila — Web Evaluation System | SRS v1.5 | 2026-04-23**  
**Prince of Songkla University**
