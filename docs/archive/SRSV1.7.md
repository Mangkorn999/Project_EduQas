# eila — Software Requirements Specification (SRS)

> ระบบประเมินเว็บไซต์มหาวิทยาลัย / Web Evaluation System
> Prince of Songkla University
> **Version 1.7 | Updated: 2026-04-24**
> **SRS Changelog from v1.6:** แก้ไข 10 ข้อจาก Clarification Review

---

## Changelog

| Version | วันที่ | สิ่งที่เปลี่ยน |
|---------|--------|--------------|
| 1.0 | 2026-04-23 | Initial SRS |
| 1.1 | 2026-04-23 | เพิ่ม Faculty Structure, Form-first Concept, Import/Export, แก้ DB Schema, ยืนยัน Status Flow |
| 1.2 | 2026-04-23 | เพิ่ม faculties table, Form Scope (faculty/university), Form Date Auto-close, Notification System |
| 1.3 | 2026-04-23 | เพิ่ม Git Branch Strategy (หัวข้อ 11) |
| 1.4 | 2026-04-23 | Template Scope (faculty_id + scope), eila_admin แยก Path, UNIQUE Constraint, University Scope Logic, Hotfix Branch, แยก eila_version ออกจาก SRS Version |
| 1.5 | 2026-04-23 | แก้ไข 42 ข้อจาก SRS Review: Security 14 ข้อ, Missing 10 ข้อ, Ambiguous 8 ข้อ, Untestable 7 ข้อ, Conflicting 3 ข้อ |
| 1.6 | 2026-04-24 | แก้ไข 5 ข้อจาก Final Sanity Check: FR-U06 (2FA→Email OTP), NFR-SEC11 (Key Management), ลบ Section 15.7 ซ้ำ, NFR-14 (Infrastructure note), audit_logs (prev_hash + hash fields) |
| **1.7** | **2026-04-24** | **แก้ไข 10 ข้อจาก Clarification Review: Executive dashboard-only access, University Scope edit rights, Import Ownership (Local Copy), answers CASCADE on question delete, Copy Form = structure only (no responses), users schema (base_role / override_role / override_by / override_at), notification_logs (next_retry_at / last_attempt_at), Pseudocode แยก 3 functions, audit_logs hash formula unified, UX rules (closed form / conflict dialog / notification targets)** |

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์
eila คือระบบเว็บสำหรับประเมินเว็บไซต์ของมหาวิทยาลัย โดย Admin สามารถสร้างแบบประเมินแบบ Drag & Drop คล้าย Google Forms กำหนด Role และขอบเขต (Faculty / University) ที่รับฟอร์ม ตั้งเวลาเปิด-ปิดอัตโนมัติ Import/Export ฟอร์มได้ และดูผลลัพธ์ผ่าน Dashboard ผู้ใช้ทุกคน Login ผ่าน PSU Passport และระบบแยก Role อัตโนมัติ

### 1.2 ขอบเขตของระบบ (Scope)
- สร้างและจัดการแบบประเมิน (Form) แบบ Form-first คล้าย Google Forms
- ระบบ Authentication ผ่าน PSU Passport (OAuth)
- กำหนดสิทธิ์การเข้าถึงตาม Role และ Faculty อย่างเข้มงวด
- Form Scope: `faculty` (เฉพาะคณะ) และ `university` (ทุก Role ทุก Faculty เห็นและตอบได้ แก้ไขได้เฉพาะ eila_admin)
- Template Scope: `faculty` (เฉพาะคณะตัวเอง) และ `global` (eila_admin สร้างให้ทุกคณะใช้)
- ตั้งเวลาเปิด-ปิดฟอร์มอัตโนมัติ พร้อมแก้ไขได้
- Import/Export โครงสร้างฟอร์ม (.json) และผลลัพธ์ (.pdf / .xlsx)
- แสดงผลลัพธ์ผ่าน Dashboard แยกตาม Faculty
- ระบบแจ้งเตือนผ่าน Email + In-app

### 1.3 คำนิยามสำคัญ (Key Definitions)

| คำ | ความหมาย |
|---|---|
| **visibility** | ใครมองเห็นฟอร์ม/ข้อมูลได้ |
| **respondable** | ใครสามารถ submit คำตอบได้ |
| **editable** | ใครสามารถแก้ไขโครงสร้างฟอร์มได้ |
| **aggregated data** | ข้อมูลรวม เช่น คะแนนเฉลี่ย, จำนวนผู้ตอบ — ไม่ระบุตัวบุคคล |
| **individual response** | ข้อมูลคำตอบรายบุคคล ระบุ user_id ได้ |
| **local copy** | สำเนาฟอร์มที่เป็นอิสระ ผูกกับ faculty ของผู้ import ไม่เชื่อมกับต้นทาง |

### 1.4 Tech Stack

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

| Role | สร้างฟอร์ม | ตอบฟอร์ม | ดู Dashboard (Aggregated) | ดู Individual Response | จัดการ Admin | ขอบเขตข้อมูล |
|---|:---:|:---:|:---:|:---:|:---:|---|
| eila_admin | ✅ | ❌ | ✅ | ✅ | ✅ | ทุก Faculty |
| faculty_admin | ✅ | ❌ | ✅ | ✅ | ❌ | แค่ Faculty ตัวเอง |
| executive | ❌ | ❌ | ✅ | ❌ | ❌ | ทุก Faculty (Aggregated เท่านั้น) |
| teacher | ❌ | ✅ | ❌ | ❌ | ❌ | เฉพาะฟอร์มที่ได้รับ |
| staff | ❌ | ✅ | ❌ | ❌ | ❌ | เฉพาะฟอร์มที่ได้รับ |
| student | ❌ | ✅ | ❌ | ❌ | ❌ | เฉพาะฟอร์มที่ได้รับ |

### 2.1 eila_admin
- Admin หลักของระบบ EILA ทั้งหมด
- จัดการ faculty_admin ได้ (เพิ่ม / ลบ / แก้ไข)
- จัดการ Faculty ในระบบได้ (เพิ่ม / ลบ / แก้ไข ผ่าน `faculties` table)
- จัดการผู้ใช้ทุก Role รวมถึง executive
- สร้างฟอร์มได้ทั้ง `faculty` scope และ `university` scope ผ่าน Path `/eila-admin/forms/*`
- **เป็น Role เดียวที่สร้าง / แก้ไข / ลบ ฟอร์ม `university` scope ได้**
- สร้าง Template ได้ทั้ง `faculty` scope และ `global` scope
- ดู Dashboard และ Export ได้ทุก Faculty รวมถึงดู Individual Response
- มีได้ 1–2 คนเท่านั้น
- `faculty_id = NULL` (ไม่ผูกกับ Faculty ใด)

### 2.2 faculty_admin
- Admin ประจำแต่ละ Faculty
- **สร้างได้เฉพาะฟอร์ม `faculty` scope ของตัวเองเท่านั้น (ไม่สามารถสร้าง university scope ได้)**
- **เห็นและจัดการได้เฉพาะฟอร์ม / Template ของ Faculty ตัวเองเท่านั้น**
- ไม่เห็นฟอร์ม / Template ของ Faculty อื่น นอกจาก Import เข้ามาเอง
- Import / Export ฟอร์ม (.json) ได้ — ฟอร์มที่ Import จะเป็น Local Copy ของ Faculty ตัวเอง
- Export ผลลัพธ์ (.pdf / .xlsx) ได้
- ดู Individual Response ใน Faculty ตัวเองได้
- มีได้หลายคนต่อ Faculty

### 2.3 executive ✏️ (Updated v1.7)
- **ดู Dashboard ได้ทุกฟอร์มทุก Faculty — เฉพาะข้อมูลรวม (Aggregated Data) เท่านั้น**
  - เห็น: คะแนนเฉลี่ย, จำนวนผู้ตอบ, กราฟ, สรุปความคิดเห็น
  - **ไม่เห็น**: ข้อมูลคำตอบรายบุคคล (individual response), user_id ของผู้ตอบ
- Export PDF และ Excel ได้ (ข้อมูล Aggregated เท่านั้น)
- **ไม่ตอบฟอร์ม** (เพื่อความถูกต้องของข้อมูล)
- **ไม่อยู่ใน Respondent Flow ทั้งหมด** — ระบบไม่แสดงฟอร์มให้ executive submit
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
### 3.2 Role Resolution Flow ✏️ (Updated v1.7)

PSU Passport Login
↓
ดึง psu_passport_id + psu_role + faculty จาก PSU
↓
เช็ค users table ว่ามี override_role ไหม?
├── มี override_role → effective_role = override_role (executive / faculty_admin / eila_admin)
│   └── บันทึก base_role = psu_role (เก็บไว้อ้างอิง)
└── ไม่มี override_role → effective_role = psu_role
└── Auto-create / Update ข้อมูลจาก PSU
(base_role: student / teacher / staff, faculty จาก PSU)
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
  - **Clarified:** การลบ question จะแสดง warning ถ้ามี answers อยู่แล้ว ว่า "question นี้มีคำตอบจาก N คนแล้ว ถ้าลบจะหายถาวร"
- **FR-F04** สามารถกำหนด URL เว็บไซต์ที่ต้องการประเมินได้
- **FR-F05** สามารถกำหนด Role ที่จะรับฟอร์มได้ (เลือกได้หลาย Role) เฉพาะ `faculty` scope
- **FR-F06** สามารถเปิด / ปิดฟอร์มได้ตลอดเวลา
- **FR-F07** ฟอร์มมีสถานะ 3 สถานะ ได้แก่ `draft` / `open` / `closed`
- **FR-F08** สามารถ Copy ฟอร์มเก่าไปสร้างใหม่และแก้ไขได้

#### Form Scope ✏️ (Updated v1.7)

- **FR-F09** ฟอร์มมี Scope 2 แบบ

| Scope | สร้างโดย | ใครเห็น (Visibility) | ใครตอบได้ (Respondable) | ใครแก้ไขได้ (Editable) | target_roles |
|-------|---------|--------|-------------|-------------|-------------|
| `faculty` | faculty_admin หรือ eila_admin | เฉพาะ Role ที่กำหนด ใน Faculty นั้น | Respondent ที่ match faculty + role | faculty_admin เจ้าของ หรือ eila_admin | ✅ ใช้ |
| `university` | eila_admin เท่านั้น | ทุก Role ทุก Faculty ทั้งหมด | Respondent ทุก Role ทุก Faculty | **eila_admin เท่านั้น** | ❌ ไม่ใช้ |

- **FR-F10** faculty_admin สร้างได้เฉพาะ `faculty` scope **(ไม่สามารถสร้าง university scope ได้)**
- **FR-F11** eila_admin สร้างได้ทั้ง `faculty` scope และ `university` scope
- **FR-F12** ฟอร์ม `university` scope:
  - ไม่มี `form_target_roles` — Respondent ทุก Role ทุก Faculty เห็นและตอบได้ทั้งหมด
  - **แก้ไขโครงสร้างฟอร์มได้เฉพาะ eila_admin เท่านั้น** (faculty_admin ไม่มีสิทธิ์แก้ไข)
  - "ทุกคนเห็น" ≠ "ทุกคนแก้ได้" — การแก้ไขยังตรวจสิทธิ์ตาม role ของ admin เสมอ

#### Form Date (Auto-close)
- **FR-F13** Admin สามารถกำหนด `open_at` และ `close_at` ล่วงหน้าได้
- **FR-F14** ระบบเปลี่ยน Status เป็น `open` อัตโนมัติเมื่อถึงเวลา `open_at`
- **FR-F15** ระบบเปลี่ยน Status เป็น `closed` อัตโนมัติเมื่อถึงเวลา `close_at`
- **FR-F16** Admin สามารถแก้ไข `close_at` เพื่อขยายเวลาได้ แม้ฟอร์มจะ `open` หรือ `closed` แล้ว
  - **Clarified:** เมื่อแก้ `close_at` ให้ฟอร์มที่ `closed` กลับมา `open` → ระบบ trigger FR-N04 (แจ้งเตือนขยายเวลา) อัตโนมัติ
- **FR-F17** `open_at` และ `close_at` เป็น Optional — ถ้าไม่กำหนด Admin ต้องเปิด/ปิดเอง

#### Status Flow
draft ⇄ open → closed
↑      |
└──────┘ (เปิดใหม่ได้)draft  → open   ✅ (กดเอง หรือระบบเปิดอัตโนมัติตาม open_at)
open   → draft  ✅ (ดึงกลับมาแก้ไข)
open   → closed ✅ (กดเอง หรือระบบปิดอัตโนมัติตาม close_at)
closed → open   ✅ (เปิดรอบใหม่ หรือขยายเวลา → trigger FR-N04)
- ถ้าฟอร์ม `closed` → Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
  - **Clarified:** ถ้าเคยตอบแล้ว → ยังสามารถดูคำตอบเดิมของตัวเองได้ (read-only mode)
  - ถ้ายังไม่เคยตอบ → เห็นเฉพาะข้อความหมดเวลา ไม่แสดงฟอร์ม

- `closed → open` ใหม่:
  - ไม่ลบ responses เก่า (เก็บไว้ทั้งหมด)
  - Respondent สามารถ update response เดิมได้ (Upsert)
  - ถ้าเคยตอบแล้ว → แสดงคำตอบเดิมให้แก้ไข พร้อม banner "ฟอร์มนี้เปิดรับคำตอบอีกครั้งแล้ว"
  - ถ้ายังไม่เคยตอบ → แสดงฟอร์มเปล่า

#### Concurrent Form Editing
- **FR-F18: Optimistic Locking**
  - ฟอร์มทุกฟอร์มมี `version` field (integer, เริ่มที่ 1)
  - เมื่อ Admin แก้ไขฟอร์มและบันทึก ระบบตรวจสอบว่า `version` ใน DB ตรงกับที่ client ส่งมาหรือไม่
  - ถ้าตรงกัน: บันทึกสำเร็จ + เพิ่ม version ขึ้น 1
  - ถ้าไม่ตรงกัน: แสดง Conflict Dialog
    - **Diff แสดง:** รายการคำถามที่เพิ่ม/ลบ/แก้ไข เปรียบเทียบ version ของตัวเองกับ version ล่าสุดใน DB
    - **Overwrite:** บันทึกทับทั้งฟอร์ม (ทุก field ที่แก้ไขในครั้งนี้) ต้องยืนยันอีกครั้ง
    - **Cancel:** ยกเลิก โหลดข้อมูล version ล่าสุด
    - Conflict Dialog ไม่ auto-close — รอ user ตัดสินใจ (ไม่มี timeout)

---

### 4.2 Template System

- **FR-T01** Admin สามารถสร้าง Template ชุดคำถามสำเร็จรูปได้
- **FR-T02** Template มี Scope 2 แบบ

| Scope | สร้างโดย | ใครเห็น |
|-------|---------|--------|
| `faculty` | faculty_admin หรือ eila_admin | เฉพาะ Faculty ตัวเอง |
| `global` | eila_admin เท่านั้น | ทุก Faculty ใช้ได้ |

- **FR-T03** faculty_admin เห็นเฉพาะ Template ของ Faculty ตัวเอง + Template global
  - Clarified: Template ที่เห็น = `scope='global'` OR (`scope='faculty'` AND `faculty_id = user.faculty_id`)
- **FR-T04** การแชร์ Template ระหว่าง Faculty ต้องทำผ่าน Export JSON → Import เท่านั้น (manual process, ไม่มี auto-share)
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

### 4.4 Import / Export ✏️ (Updated v1.7)

#### 📤 Export โครงสร้างฟอร์ม
- **FR-IE01** Admin สามารถ Export โครงสร้างฟอร์มออกเป็นไฟล์ `.json` ได้
- **FR-IE02** ไฟล์ `.json` ที่ Export มีเฉพาะโครงสร้างคำถาม ไม่มีคำตอบของ User
- **FR-IE03** โครงสร้าง JSON มาตรฐาน ดูที่หัวข้อ 8

#### 📥 Import ฟอร์ม
- **FR-IE04** Admin สามารถ Import ไฟล์ `.json` เพื่อนำคำถามเข้าฟอร์มได้
- **FR-IE05** ระบบ Preview รายการคำถามที่จะ Import ให้ Admin ยืนยันก่อนเสมอ
- **FR-IE06** หากฟอร์มมีคำถามอยู่แล้ว ระบบถามว่า "เพิ่มต่อท้าย" หรือ "แทนที่ทั้งหมด"
- **FR-IE07** รองรับไฟล์ `.json` จากระบบอื่นที่ไม่ใช่ eila หาก Format ถูกต้องตาม Validation Rules ในหัวข้อ 8.2
  - JSON ต้องมี `questions` array ที่มี fields ที่จำเป็น: `question_text`, `question_type`
  - Optional fields: `order`, `required` (default = false)
- **FR-IE08** หาก Format ผิด ระบบแจ้ง Error พร้อมระบุว่าผิดตรงไหน
- **FR-IE09** คำถามที่ Import มาแล้วสามารถแก้ไข / ลบ / เรียงลำดับใหม่ได้อิสระ

#### 📋 Import Ownership Rule (Local Copy) ✏️ (New v1.7)
- **FR-IE10** ฟอร์มหรือคำถามที่ Import เข้ามาจะกลายเป็น **Local Copy** ของ Faculty ผู้ Import:
  - **เห็น (View):** faculty_admin เห็นเฉพาะฟอร์มใน Faculty ของตัวเอง (จำกัดตาม faculty)
  - **นำเข้า (Import):** faculty_admin สามารถ import ไฟล์ JSON ได้ ถ้ามีสิทธิ์ admin และไฟล์ผ่าน validation
  - **หลัง Import:** ฟอร์มที่ได้เป็นสำเนาอิสระ (Local Copy) ที่:
    - `faculty_id` = faculty ของ faculty_admin ผู้ import
    - `imported_from` = ชื่อไฟล์ JSON ต้นทาง (เพื่อ reference เท่านั้น)
    - **ไม่มีการเชื่อมโยง** กับฟอร์มหรือ Faculty ต้นทางอีกต่อไป
    - แก้ไขได้อิสระ — ไม่กระทบต้นฉบับ
    - ความเป็น ownership เป็นของ Faculty ผู้ import ทันที

#### 📤 Export ผลลัพธ์
- **FR-IE11** Admin และ Executive สามารถ Export ผลลัพธ์เป็น `.pdf` ได้
- **FR-IE12** Admin และ Executive สามารถ Export ผลลัพธ์เป็น `.xlsx` ได้
  - **Clarified:** Executive export ได้เฉพาะ Aggregated Data (ไม่มี individual response)

---

### 4.5 การตอบฟอร์ม (Response) ✏️ (Updated v1.7)

- **FR-R01** Respondent เห็นฟอร์มที่ถูกกำหนดให้ Role และ Faculty ตัวเอง รวมถึงฟอร์ม `university` scope ทุกชิ้น
  - Clarified: Respondent เห็นฟอร์มหาก:
    - `form.scope = 'university'` ทั้งหมด หรือ
    - `form.scope = 'faculty'` AND `form.faculty_id = user.faculty_id` AND `user.role IN form_target_roles`

- **FR-R02** แสดงสถานะฟอร์ม: ยังไม่ตอบ / ตอบแล้ว / หมดเวลาแล้ว

- **FR-R03** Respondent สามารถแก้ไขคำตอบได้จนกว่าฟอร์มจะ `closed`

- **FR-R04** เมื่อฟอร์ม `closed`:
  - ถ้า **เคยตอบแล้ว** → แสดงคำตอบเดิมของตัวเอง (read-only) พร้อมข้อความ "หมดเวลาการประเมินแล้ว — คำตอบของคุณถูกบันทึกไว้แล้ว"
  - ถ้า **ยังไม่เคยตอบ** → แสดงเฉพาะข้อความ "หมดเวลาการประเมินแล้ว" ไม่แสดงฟอร์ม

- **FR-R05** ระบบเก็บเฉพาะคำตอบล่าสุด (Upsert) ไม่เก็บ History การแก้ไข
  - Clarified: Upsert = UPDATE ถ้ามีอยู่แล้ว, INSERT ถ้ายังไม่มี
  - Audit Trail: การแก้ไขทุกครั้งถูกบันทึกใน `audit_logs` table
  - Clarified: History ของคำตอบดูจาก `audit_log` ไม่ใช่จาก `answers` table

- **FR-R06** Respondent ไม่สามารถเห็นคำตอบของคนอื่นได้

- **FR-R07** ระบบป้องกันการส่งซ้ำด้วย UNIQUE `(form_id, user_id)` ใน `responses` table

- **FR-R08 Copy Form Rule ✏️ (New v1.7)**
  - การ Copy ฟอร์ม (FR-F08) จะ copy เฉพาะ **โครงสร้างคำถาม (form_questions)** เท่านั้น
  - **ไม่ copy responses และ answers** — ฟอร์มใหม่เริ่มต้นโดยไม่มีคำตอบใด ๆ
  - ฟอร์มใหม่มี `id` ใหม่, `status = draft`, `copied_from = id ของฟอร์มเดิม`
  - คำถามที่ copy มาแก้ไขได้อิสระ ไม่กระทบฟอร์มต้นทาง

- **FR-R09 Cascade Delete Rule ✏️ (New v1.7)**
  - เมื่อ question (`form_questions`) ถูกลบ → **answers ที่ผูกกับ question นั้นถูกลบตามด้วย (CASCADE)**
  - ก่อนลบ ระบบต้องแสดง Warning: "question นี้มีคำตอบจาก N คนแล้ว ถ้าลบ คำตอบเหล่านั้นจะหายถาวร"
  - Admin ต้องยืนยันก่อนลบจะเกิดขึ้น
  - การลบ question บันทึกลง `audit_logs` (entity_type = QUESTION, action = DELETE)

---

### 4.6 Dashboard & Analytics ✏️ (Updated v1.7)

- **FR-D01** faculty_admin ดูผลลัพธ์ได้เฉพาะฟอร์มใน Faculty ตัวเอง
- **FR-D02** eila_admin ดู Dashboard ได้ทุกฟอร์มทุก Faculty รวมถึง Individual Response
- **FR-D02b** executive ดู Dashboard ได้ทุกฟอร์มทุก Faculty — **เฉพาะ Aggregated Data เท่านั้น**
  - เห็น: คะแนนเฉลี่ย, % ผู้ตอบ, กราฟ, สรุปความคิดเห็น
  - **ไม่เห็น**: ชื่อ/id ของผู้ตอบ, คำตอบรายบุคคล
- **FR-D03** แสดงคะแนนเฉลี่ยของแต่ละคำถาม
- **FR-D04** แสดงกราฟสรุปผลภาพรวม (Bar Chart คะแนน, สรุป Short Text)
  - Clarified: Bar chart sorted by count descending, max 20 bars
  - Short text: max 100 comments, sorted by recency
- **FR-D05** แสดงจำนวนผู้ตอบทั้งหมด และ % ของผู้ที่ยังไม่ตอบ
  - Clarified: % = (respondents_who_answered / total_form_target_roles) × 100
  - total_form_target_roles = จำนวนผู้ใช้ทั้งหมดที่มี role ตรงกับ form_target_roles ใน Faculty นั้น
- **FR-D06** แสดงความคิดเห็น (Short Text) ทั้งหมด — **ไม่ระบุชื่อผู้ตอบให้ executive**

---

### 4.7 User Management

- **FR-U01** eila_admin สามารถเพิ่ม / ลบ / แก้ไข faculty_admin และ executive ได้
  - Clarified: "ลบ" = soft delete (mark inactive), ไม่ hard delete
  - Clarified: รองรับ bulk operations (XLSX import)
  - Clarified: ทุก query ต้อง filter WHERE `is_active = true`

- **FR-U02** eila_admin กำหนด Faculty ให้ faculty_admin ได้ (เลือกจาก `faculties` table)

- **FR-U03** eila_admin จัดการ `faculties` table ได้ (เพิ่ม / ลบ / แก้ไขคณะ)
  - Clarified: "ลบ" Faculty = soft delete, ไม่ลบถ้ามี user/form อยู่

- **FR-U04** eila_admin ดูภาพรวมผู้ใช้งานทั้งระบบได้

- **FR-U05: Audit Log** — บันทึกทุกการเปลี่ยนแปลงที่สำคัญ (ดู Section 4.10)

- **FR-U06: Role Override ✏️ (Updated v1.7)**
  - เฉพาะ eila_admin สามารถ override role ได้
  - Override เป็น **Permanent** จนกว่า eila_admin จะเปลี่ยนแปลง (ไม่ใช่ temporary)
  - โครงสร้าง Role:
    - `base_role` = role จาก PSU Passport (student/teacher/staff) — ค่าก่อน override
    - `override_role` = role ที่ eila_admin กำหนด (eila_admin/faculty_admin/executive/NULL)
    - `effective_role` = `override_role` ถ้ามี, ไม่งั้นใช้ `base_role` — คือ role ที่ระบบใช้จริง
  - เมื่อ user login อีกครั้ง: ถ้ายัง มี `override_role` → คงใช้ `override_role` ไม่ถูก PSU Passport override ทับ
  - สามารถยกเลิก override ได้ (ลบ `override_role` → กลับใช้ `base_role`)
  - 2FA สำหรับ Role Override — Phase 1: Email OTP
    - เมื่อ eila_admin กด "Override Role" → ระบบส่ง OTP 6 หลักไปยัง PSU Email ของ eila_admin
    - OTP มีอายุ 5 นาที และใช้ได้ครั้งเดียว
    - eila_admin ต้องกรอก OTP ให้ถูกต้องก่อน override จึงจะสำเร็จ
    - ถ้ากรอก OTP ผิด 3 ครั้ง → block การ override 15 นาที
  - Phase 2 (Future): พิจารณาเพิ่ม TOTP (Google Authenticator / Authy)
  - ทุก role override ถูกบันทึกใน audit log (รวม override_by, override_at, override_reason)
  - User ที่ถูก override role จะได้รับ notification

---

### 4.8 Notification System (Phase 2)

ช่องทาง: Email (SMTP PSU) + In-app (ไอคอนระฆังในระบบ)

| รหัส | เหตุการณ์ | ผู้รับ | ช่องทาง |
|------|----------|--------|---------|
| FR-N01 | Admin เผยแพร่ฟอร์ม (status → open) | Respondent ที่เกี่ยวข้องทุกคน | Email + In-app |
| FR-N02 | เหลือ 3 วันก่อนปิด + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N03 | เหลือ 1 วันก่อนปิด + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N04 | Admin ขยายเวลา (close_at ถูกแก้ไข) | Respondent ที่เกี่ยวข้องทุกคน (ทั้งที่ตอบแล้วและยังไม่ตอบ) | Email + In-app |
| FR-N05 | Respondent ส่งฟอร์มสำเร็จ | Respondent คนนั้น | In-app เท่านั้น |
| FR-N06 | ฟอร์ม closed อัตโนมัติตาม Scheduler | faculty_admin เจ้าของฟอร์ม | In-app เท่านั้น |

- **FR-N07** In-app Notification แสดงเป็นไอคอนระฆัง บอกจำนวนที่ยังไม่อ่าน
- **FR-N08** ผู้ใช้สามารถกด Mark as Read ได้
- **FR-N09** Email แจ้งเตือนมีลิงก์ตรงไปยังฟอร์มนั้น

#### Clarified Notification Targets (v1.7)
- **FR-N01 `form_opened`:** ส่งให้ Respondent ที่อยู่ใน faculty + role ที่กำหนด (faculty scope) หรือทุก Respondent (university scope)
- **FR-N02/N03 `reminder_3d/1d`:** ส่งเฉพาะ Respondent ที่ **ยังไม่ได้ตอบ** ณ เวลาส่ง (ตรวจจาก responses table)
- **FR-N04 `deadline_extended`:** ส่งให้ Respondent ที่เกี่ยวข้องทุกคน ทั้งที่ตอบแล้วและยังไม่ตอบ
- **FR-N05 `submitted`:** ส่งให้ Respondent คนที่เพิ่งส่งคำตอบเท่านั้น
- **FR-N06 `form_closed`:** ส่งให้ faculty_admin เจ้าของฟอร์ม

#### Clarified Timing (FR-N02, FR-N03)
- Reminder ส่งที่เวลา 9:00 AM PSU timezone (UTC+7)
- "3 วัน" = `close_at` minus 72 ชั่วโมง
- "1 วัน" = `close_at` minus 24 ชั่วโมง

#### Email Failure Handling
- **FR-N10** ถ้า Email ส่งไม่สำเร็จ:
  - Retry 3 ครั้งด้วย exponential backoff (1 นาที, 5 นาที, 15 นาที)
  - บันทึก error ลง `notification_logs` table (รวม `next_retry_at`, `last_attempt_at`)
  - ถ้า retry ครบ 3 ครั้งแล้วยังไม่สำเร็จ → แจ้ง admin ผ่าน in-app

---

### 4.9 Error Handling

- **FR-ERR01: Input Validation**
  - ระบบต้อง validate ทุก user input ก่อนประมวลผล
  - Form input validation:
    - Form title: required, max 200 characters
    - Question text: required, max 1000 characters
    - Website URL: must be valid URL format
    - Rating value: integer 1-5
  - Error response format: ดู Section 14.2

- **FR-ERR02: Timeout Handling**
  - API request timeout: 30 วินาที
  - ถ้า PSU Passport timeout → แสดงข้อความ "ไม่สามารถเชื่อมต่อระบบ PSU ได้ กรุณาลองใหม่อีกครั้ง"
  - ระบบ retry PSU Passport API 3 ครั้งก่อนแจ้ง error

- **FR-ERR03: JSON Import Error Handling**
  - ระบบต้อง validate JSON format ก่อน import
  - Error messages ต้องระบุชัดเจนว่าผิดตรงไหน:
    - "questions ต้องเป็น Array"
    - "question_text ข้อที่ 3 ว่างเปล่า"
    - "question_type ข้อที่ 5 ไม่ถูกต้อง (ต้องเป็น rating หรือ short_text)"

---

### 4.10 Audit Logging

- **FR-U05: Audit Log** — ระบบบันทึกทุกการเปลี่ยนแปลงที่สำคัญ:
  - สร้าง / แก้ไข / ลบ ฟอร์ม
  - สร้าง / แก้ไข / ลบ Template
  - ลบ Question (พร้อม answers ที่ cascade)
  - เปลี่ยน role ของ user (รวม override_by, override_at, override_reason)
  - เพิ่ม / ลบ / แก้ไข Faculty
  - Login / Logout
  - Export ข้อมูล (PDF / Excel / JSON)

- eila_admin สามารถดู Audit Log ของทั้งระบบได้
- Audit log เก็บไว้ 1 ปี

---

## 5. Non-Functional Requirements

### 5.1 General

- **NFR-01** Phase 1 ใช้ Single Role ต่อ User (Enum) รองรับ Multi-role ในอนาคต โดย Migrate เป็น `user_roles` table
- **NFR-02** ระบบต้องรองรับการใช้งานบน Mobile (Responsive)
  - Clarified: Support breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop)
  - Test on Safari iOS 13+, Chrome Android 8+
- **NFR-03** ระบบต้องมีการตรวจสอบสิทธิ์ทุก API Request (Authorization)
  - ทุก API ต้อง auth ยกเว้น:
    - `GET /api/health` — health check
    - `GET /api/forms/:id/public` — ฟอร์ม public (ถ้ามี)
- **NFR-04** ข้อมูลคำตอบต้องถูกต้องและ Tamper-proof
  - ใช้ Audit Log track ทุกการเปลี่ยนแปลง (ไม่ลบคำตอบเดิม)
- **NFR-05** ระบบต้องรองรับ Admin หลายคนพร้อมกัน
  - รองรับ ≥ 10 concurrent admin users แก้ไขฟอร์มต่างกันได้
  - ฟอร์มเดียวกัน → ใช้ Optimistic Locking (FR-F18)
- **NFR-06** ไฟล์ Import ต้องผ่านการ Validate Format ก่อนนำเข้าระบบเสมอ
  - Max file: 5 MB, max 500 questions, max text 500 chars
- **NFR-07** ระบบต้องมี Scheduler (Cron Job) สำหรับเปลี่ยน Status ฟอร์มอัตโนมัติตาม `open_at` / `close_at`
  - Scheduler ตรวจสอบทุก 1-5 นาที
  - Acceptance: 98% ของฟอร์มเปลี่ยน status ภายใน 5 นาทีของเวลา trigger
- **NFR-08** ระบบต้องมี Scheduler สำหรับตรวจสอบและส่ง Notification เตือนก่อนปิดฟอร์ม (ทุก 1 ชั่วโมง)
  - Scheduler รันทุก 1 ชั่วโมง ที่เวลา 00 นาที
- **NFR-09** faculty_admin ต้องไม่สามารถเข้าถึงข้อมูล Faculty อื่นได้ผ่านทุก API
  - ทุก API query ต้อง filter by `user.faculty_id` (defense in depth)

### 5.2 Data Retention & Backup

- **NFR-10: Data Retention**
  - ข้อมูลฟอร์มและคำตอบที่เก่ากว่า 2 ปี ต้องถูก archive
  - Archive = ย้ายข้อมูลไป archive table / cold storage
  - ข้อมูลใน archive ยังสามารถดูได้ แต่ไม่แสดงใน dashboard ปกติ
  - ข้อมูลที่เก่ากว่า 5 ปี → ลบได้ (ตามนโยบายมหาวิทยาลัย)
  - Implementation: Scheduler รันทุกวันที่ 02:30 น.
  - Archive tables: `forms_archive`, `responses_archive`, `answers_archive`

- **NFR-11: Backup & Recovery**
  - Database backup ทุกวัน เวลา 02:00 น.
  - Backup เก็บไว้ 7 วัน
  - Recovery time objective (RTO): < 1 ชั่วโมง
  - Recovery point objective (RPO): < 24 ชั่วโมง
  - Disaster Recovery Plan: Backup off-site, ทดสอบ recovery ทุกเดือน, มี runbook

### 5.3 Form Versioning

- **NFR-12: Form Versioning**
  - ระบบเก็บประวัติการเปลี่ยนแปลงโครงสร้างฟอร์ม
  - Version เก็บ: `form_id`, `version`, `questions_snapshot` (JSON), `changed_by`, `changed_at`
  - Admin สามารถดู version history ของฟอร์มได้
  - Admin สามารถ rollback ไป version เก่าได้ (create new form จาก version เก่า)

### 5.4 API Documentation

- **NFR-13: OpenAPI Specification**
  - ระบบต้องมี OpenAPI 3.0 specification สำหรับทุก REST API
  - API docs เข้าถึงได้ที่ `/api/docs` (Swagger UI)
  - API spec update อัตโนมัติเมื่อ code เปลี่ยน

### 5.5 Performance

- **NFR-14: Performance Targets**
  - API response time < 500ms สำหรับ 95th percentile
  - รองรับ 1000 concurrent users
  - Dashboard load time < 2 วินาที
  - Form submit < 1 วินาที
  - **Note:** ตัวเลข 1000 concurrent users เป็น target TBD ตาม PSU infrastructure — จะ verify อีกครั้งก่อน Production

---

## 6. Security Requirements

### 6.1 Transport Security
- **NFR-SEC01:** ทุกการสื่อสารต้องใช้ HTTPS ด้วย TLS 1.2 ขึ้นไป

### 6.2 Authentication Security
- **NFR-SEC02:** Implement CSRF tokens สำหรับทุก POST/PUT/DELETE request (SameSite=Strict)
- **NFR-SEC07:** Session cookies: Secure flag, HttpOnly flag, SameSite=Strict; Session ID สุ่มด้วย cryptographic random
- **NFR-SEC10:** OAuth 2.0 PKCE flow, validate state parameter, verify JWT signature

### 6.3 Input/Output Security
- **NFR-SEC03:** ทุก user input ต้อง sanitize/escape; ไม่ใช้ `dangerouslySetInnerHTML`; Content Security Policy (CSP) header
- **NFR-SEC04:** ใช้ parameterized queries / ORM สำหรับทุก database operation, ห้าม string concatenation ใน query
- **NFR-SEC06:** File upload: JSON เท่านั้น (ตรวจ Content-Type + magic number), max 5 MB, ลบไฟล์หลังประมวลผล

### 6.4 API Security
- **NFR-SEC05:** Rate limit: 100 req/min per IP, 50 req/min per user, Login: 5 attempts/min per IP
- **NFR-SEC08:** ทุก API query ต้อง filter by `user.faculty_id` (defense in depth)

### 6.5 Audit & Monitoring
- **NFR-SEC09:** Audit log ทุก admin action, login/logout, เก็บ 1 ปี, append-only (ไม่มี UPDATE/DELETE)
- **NFR-SEC11:** Encryption at Rest
  - Email (AES-256), Responses (optional, AES-256)
  - Key Management: เก็บใน environment variable `ENCRYPTION_KEY`, พิจารณา KMS ก่อน Production
  - Key rotation ทุก 6 เดือน, ห้าม hardcode ใน codebase
- **NFR-SEC12:** Security Monitoring: alert เมื่อ failed login > 5/min, spike ใน error rate, SQL injection attempt

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

### users ✏️ (Updated v1.7)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| psu_passport_id | String | UNIQUE — ID จาก PSU Passport |
| name | String | ชื่อ-นามสกุล |
| email | String | อีเมลมหาวิทยาลัย (AES-256 encrypted) |
| base_role | Enum | student / teacher / staff / NULL — role จาก PSU Passport ก่อน override |
| override_role | Enum | eila_admin / faculty_admin / executive / NULL — role ที่ eila_admin กำหนด |
| effective_role | Computed | = override_role ถ้ามี, ไม่งั้น = base_role — role ที่ระบบใช้จริง |
| override_by | UUID | FK → users (eila_admin ที่ทำการ override) NULLABLE |
| override_at | DateTime | เวลาที่ override NULLABLE |
| override_reason | String | เหตุผลการ override NULLABLE |
| faculty_id | UUID | FK → faculties (NULL สำหรับ eila_admin) |
| is_active | Boolean | Soft delete (default: true) |
| last_login_at | DateTime | ครั้งล่าสุดที่ login |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

> **Note:** `effective_role` ไม่เป็น column จริงใน DB — คำนวณที่ Application Layer:
> `effective_role = override_role ?? base_role`

### templates
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| name | String | ชื่อ Template |
| description | String | คำอธิบาย |
| scope | Enum | faculty / global |
| faculty_id | UUID | FK → faculties (NULL ถ้า scope = global) |
| created_by | UUID | FK → users |
| created_at | DateTime | วันที่สร้าง |

> หมายเหตุ: `scope = global` สร้างได้เฉพาะ eila_admin

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
| scope | Enum | faculty / university |
| faculty_id | UUID | FK → faculties (NULL ถ้า scope = university) |
| template_id | UUID | FK → templates (NULLABLE) |
| copied_from | UUID | FK → forms (NULLABLE) — track ว่า copy มาจากฟอร์มไหน |
| imported_from | String | ชื่อไฟล์ที่ Import มา (NULLABLE) |
| status | Enum | draft / open / closed |
| open_at | DateTime | เวลาเปิดอัตโนมัติ (NULLABLE) |
| close_at | DateTime | เวลาปิดอัตโนมัติ (NULLABLE) |
| version | Integer | Optimistic locking (default: 1) |
| created_by | UUID | FK → users |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### form_questions ✏️ (Updated v1.7)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| question_text | String | ข้อคำถาม |
| question_type | Enum | rating / short_text |
| order | Integer | ลำดับ (Drag & Drop) |
| required | Boolean | บังคับตอบ |
| created_at | DateTime | วันที่สร้าง |

> หมายเหตุ: คำถามทุกข้ออยู่ใน `form_questions` เสมอ ไม่ว่าจะสร้างเอง / Clone จาก Template / Import จาก JSON
> การลบ question จะ CASCADE ลบ answers ที่เกี่ยวข้องด้วย (ดู FR-R09)

### form_target_roles
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| role | Enum | teacher / staff / student |

> ใช้เฉพาะฟอร์ม `scope = faculty` เท่านั้น — ฟอร์ม `university` scope ไม่มี record ใน table นี้

### responses
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| user_id | UUID | FK → users |
| submitted_at | DateTime | วันที่ส่งครั้งแรก |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

> Constraint: UNIQUE `(form_id, user_id)` — ป้องกัน User ส่งซ้ำในฟอร์มเดียวกัน

### answers ✏️ (Updated v1.7)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| response_id | UUID | FK → responses |
| question_id | UUID | FK → form_questions **ON DELETE CASCADE** |
| rating_value | Integer | ถ้าเป็น Rating (1–5) |
| text_value | String | ถ้าเป็น Short Text |
| created_at | DateTime | วันที่สร้าง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

> Constraint: UNIQUE `(response_id, question_id)` — รองรับ Upsert เก็บเฉพาะคำตอบล่าสุด
> **CASCADE:** เมื่อ question ถูกลบ → answers ที่ผูกกับ question นั้นถูกลบด้วยอัตโนมัติ

### notifications (Phase 2)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| user_id | UUID | FK → users |
| type | Enum | form_opened / reminder_3d / reminder_1d / deadline_extended / submitted / form_closed |
| form_id | UUID | FK → forms |
| message | String | ข้อความแจ้งเตือน |
| is_read | Boolean | อ่านแล้วหรือยัง |
| created_at | DateTime | วันที่สร้าง |

### audit_logs ✏️ (Updated v1.7 — Unified Hash Formula)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| user_id | UUID | FK → users |
| action | Enum | CREATE / UPDATE / DELETE / LOGIN / LOGOUT / EXPORT |
| entity_type | Enum | FORM / TEMPLATE / USER / FACULTY / RESPONSE / QUESTION |
| entity_id | UUID | ID ของ entity ที่ถูกทำ |
| old_value | JSON | ค่าเดิม (ก่อนแก้ไข) |
| new_value | JSON | ค่าใหม่ (หลังแก้ไข) |
| ip_address | String | IP address |
| prev_hash | String | SHA-256 hash ของ record ก่อนหน้า (เริ่มต้น = `'0'.repeat(64)`) |
| hash | String | SHA-256 hash ของ record นี้ (ดูสูตรด้านล่าง) |
| created_at | DateTime | วันที่ทำ |

#### Hash Chain Formula (Unified ✏️ v1.7)
hash = SHA256(
id + user_id + action + entity_id +
JSON.stringify(old_value) +
JSON.stringify(new_value) +
prev_hash + created_at.toISOString()
)> - รวม `old_value` และ `new_value` ในสูตร เพื่อให้ tamper-proof จริง (แก้ข้อมูลแล้วตรวจจับได้)
> - `prev_hash` ของ record แรก = `'0'.repeat(64)`
> - ทุก record ใหม่ตั้ง `prev_hash = hash ของ record ก่อนหน้า`
> - eila_admin verify chain ได้ผ่าน `GET /api/admin/audit-logs/verify`
> - ไม่มี UPDATE/DELETE permission บน table นี้ (append-only)

### form_versions
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| version | Integer | Version number (1, 2, 3, ...) |
| questions_snapshot | JSON | Snapshot ของคำถาม ณ เวลานั้น |
| changed_by | UUID | FK → users |
| changed_at | DateTime | วันที่แก้ไข |

### notification_logs ✏️ (Updated v1.7)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| notification_id | UUID | FK → notifications |
| attempt | Integer | ครั้งที่ retry (1, 2, 3) |
| status | Enum | success / failed / pending |
| error_message | String | Error message (ถ้า failed) |
| next_retry_at | DateTime | เวลาที่จะ retry ครั้งถัดไป (NULLABLE) |
| last_attempt_at | DateTime | เวลาที่ลองส่งครั้งล่าสุด |
| created_at | DateTime | วันที่สร้าง record นี้ |

### Recommended Indexes
| Table | Index | Purpose |
|---|---|---|
| forms | idx_forms_faculty_id | Filter by faculty |
| forms | idx_forms_scope_faculty | Composite index for form visibility (scope, faculty_id) |
| form_target_roles | idx_form_target_roles_form_id | Join query |
| form_target_roles | idx_form_target_roles_role | Filter by role |
| audit_logs | idx_audit_logs_user_id | Audit trail by user |
| audit_logs | idx_audit_logs_entity | Entity history (entity_type, entity_id) |
| audit_logs | idx_audit_logs_created_at | Time-based queries |
| responses | idx_responses_form_user | UNIQUE constraint already covers this |
| users | idx_users_faculty_id | Filter by faculty |
| users | idx_users_psu_passport | Login lookup |
| users | idx_users_override_role | Filter overridden roles |

---

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

หมายเหตุ: ใช้ eila_schema_version แยกจาก SRS Version — อัปเดตเฉพาะเมื่อโครงสร้าง JSON เปลี่ยนแปลงเท่านั้น
8.2 Validation RulesFieldRuleError Messagequestionsต้องเป็น Array"questions ต้องเป็น Array"question_textต้องมีค่า ไม่ว่าง"question_text ข้อที่ N ว่างเปล่า"question_typeต้องเป็น rating หรือ short_text"question_type ข้อที่ N ไม่ถูกต้อง (ต้องเป็น rating หรือ short_text)"requiredต้องเป็น boolean"required ข้อที่ N ต้องเป็น true/false"orderต้องเป็น Integer"order ข้อที่ N ต้องเป็นตัวเลข"file sizeMax 5 MB"ไฟล์ใหญ่เกิน 5 MB"questions countMax 500"คำถามเกิน 500 ข้อ"text lengthMax 1000 chars per question"question_text ข้อที่ N ยาวเกิน 1000 ตัวอักษร"8.3 ตัวอย่าง JSON ที่ถูกต้องและผิด (v1.7)✅ ถูกต้อง (Minimal valid JSON):{
  "questions": [
    { "question_text": "คุณพอใจกับเว็บไซต์มากน้อยเพียงใด", "question_type": "rating" },
    { "question_text": "ข้อเสนอแนะเพิ่มเติม", "question_type": "short_text" }
  ]
}
❌ ผิด — missing question_text:{
  "questions": [
    { "question_type": "rating" }
  ]
}
// Error: "question_text ข้อที่ 1 ว่างเปล่า"
❌ ผิด — question_type ไม่ถูกต้อง:{
  "questions": [
    { "question_text": "คำถาม", "question_type": "checkbox" }
  ]
}
// Error: "question_type ข้อที่ 1 ไม่ถูกต้อง (ต้องเป็น rating หรือ short_text)"
8.4 Import Conflict Flowมีคำถามในฟอร์มอยู่แล้ว + Import ใหม่
          ↓
ระบบแสดง Dialog
┌─────────────────────────────────┐
│ ฟอร์มมีคำถามอยู่แล้ว 5 ข้อ     │
│ ต้องการ Import 8 คำถามใหม่      │
│                                 │
│ [เพิ่มต่อท้าย] [แทนที่ทั้งหมด]  │
└─────────────────────────────────┘
9. หน้าเว็บ (Pages)ทั่วไปPathคำอธิบาย/Landing Page + ปุ่ม Login/auth/callbackPSU Passport OAuth Callbackeila_adminPathคำอธิบาย/eila-admin/dashboardภาพรวมระบบทั้งหมดทุก Faculty/eila-admin/usersจัดการผู้ใช้ทุก Role/eila-admin/facultiesจัดการ Faculty (เพิ่ม / ลบ / แก้ไข)/eila-admin/formsรายการฟอร์มทั้งหมดทุก Faculty/eila-admin/forms/createสร้างฟอร์มใหม่ (เลือก scope ได้)/eila-admin/forms/[id]/editแก้ไขฟอร์ม/eila-admin/forms/[id]/resultsดูผลลัพธ์ + Individual Response + Export/eila-admin/templatesรายการ Template ทั้งหมด (global + faculty)/eila-admin/audit-logsดู Audit Log ทั้งระบบfaculty_adminPathคำอธิบาย/admin/dashboardสรุปภาพรวมฟอร์มของ Faculty ตัวเอง/admin/formsรายการฟอร์มของ Faculty ตัวเอง/admin/forms/createสร้างฟอร์มใหม่ (faculty scope เท่านั้น)/admin/forms/[id]/editแก้ไขฟอร์ม + Drag & Drop + Import/Export + ตั้งเวลา/admin/forms/[id]/copyCopy ฟอร์มไปสร้างใหม่ (structure เท่านั้น ไม่มี responses)/admin/forms/[id]/resultsดูผลลัพธ์ + Individual Response + Export PDF/Excel/admin/templatesTemplate ของ Faculty ตัวเอง + global/admin/templates/createสร้าง Template ใหม่ (faculty scope)/admin/templates/[id]/editแก้ไข Templateexecutive ✏️ (Updated v1.7)Pathคำอธิบาย/executive/dashboardDashboard ทุกฟอร์มทุก Faculty (Aggregated Data เท่านั้น)/executive/forms/[id]/resultsดูผลลัพธ์ Aggregated + Export (ไม่มี individual response)RespondentPathคำอธิบาย/homeรายการฟอร์มที่ได้รับ (faculty + university scope) พร้อม Status/forms/[id]หน้าตอบฟอร์ม (ถ้าตอบแล้ว → แสดงคำตอบเดิมให้แก้ไขได้) / ถ้า closed + เคยตอบ → read-only/forms/[id]/doneหน้ายืนยันส่งแล้ว10. แผนการพัฒนา (Development Phases)Phase 1 — MVP
 PSU Passport Login + Role Resolution + Auto-create User
 6 Role พร้อม Faculty Scope + NFR-09 (Data Isolation)
 faculties table + eila_admin จัดการ Faculty
 Form Builder แบบ Form-first (Drag & Drop)
 Form Scope: faculty / university (university แก้ไขได้เฉพาะ eila_admin)
 Template Scope: faculty / global
 Form Date: open_at / close_at + Auto-close Scheduler
 Template System (Clone เข้า form_questions)
 Copy ฟอร์มเก่า (structure เท่านั้น ไม่มี responses)
 Import / Export JSON (โครงสร้างฟอร์ม + Local Copy rule)
 ตอบฟอร์มตาม Role + Scope + Status
 Closed form: แสดงคำตอบเดิม (read-only) หรือข้อความหมดเวลา
 UNIQUE Constraint ป้องกันส่งซ้ำ
 ดูผล Dashboard แยก Faculty
 Executive: Aggregated data เท่านั้น
 Optimistic Locking + Conflict Dialog (FR-F18)
 Session Management (FR-AUTH01-04)
 Audit Logging + Hash Chain — สูตร unified (FR-U05, NFR-SEC09)
 Error Handling (FR-ERR01-03)
 Role Override + Email OTP 2FA + base_role/override_role structure (FR-U06)
 Security Requirements (NFR-SEC01-12)
 answers CASCADE on question delete (FR-R09)
Phase 2 — ปรับปรุง
 Export PDF & Excel (ผลลัพธ์)
 กราฟ Analytics (Bar Chart, สรุป Short Text)
 Dashboard ผู้บริหาร (Executive)
 Notification System (Email + In-app) รวม retry logic + notification_logs
 Form Versioning (NFR-12)
 Data Retention & Backup (NFR-10, NFR-11)
 Role Override TOTP 2FA (Phase 2 upgrade)
Phase 3 — ขยาย
 เพิ่มประเภทคำถาม (ปรนัย / Dropdown)
 eila_admin Panel เต็มรูปแบบ
 Audit Log UI
 Multi-role Support (Migrate user_roles table)
 API Documentation (NFR-13)
 Performance Optimization (NFR-14)
11. การแบ่งงาน (Team)คนที่ 1 — Backend + Auth
 ติดตั้ง Fastify + PostgreSQL
 เชื่อม PSU Passport OAuth + Role Resolution + Auto-create User
 Implement OAuth PKCE flow (NFR-SEC10)
 Implement Session Management (FR-AUTH01-04)
 API: faculties CRUD
 API: users / roles / permissions / faculty scope + Data Isolation (NFR-09)
 API: users — base_role / override_role / effective_role logic
 API: audit_logs (append-only + SHA-256 hash chain — unified formula)
 API: audit_logs/verify (verify hash chain integrity)
 API: forms CRUD + Scope Logic (faculty / university)
 API: forms — university scope edit permission check (eila_admin only)
 API: forms optimistic locking
 API: templates CRUD + Scope Logic (faculty / global)
 API: template_questions / form_questions
 API: form_target_roles (เฉพาะ faculty scope)
 API: responses / answers (Upsert + UNIQUE Constraint)
 API: answers CASCADE on question delete + warning ก่อนลบ (FR-R09)
 API: Import JSON (Validate + Insert into form_questions + Local Copy rule)
 API: Export JSON (Form Structure)
 Scheduler: Auto open/close ตาม open_at / close_at
 Scheduler: Notification trigger — Phase 2 (รวม next_retry_at logic)
 Error Handling (FR-ERR01-03)
 Export PDF + Excel — Phase 2 (executive = aggregated only)
 Email Notification (Nodemailer) — Phase 2
 Email retry logic + notification_logs (next_retry_at / last_attempt_at) (FR-N10)
 Role Override API + Email OTP (FR-U06)
 ระบบสิทธิ์ทั้ง 6 Role พร้อม Faculty Scope
 Security: Rate Limiting (NFR-SEC05)
 Security: CSRF Protection (NFR-SEC02)
 Encryption at Rest (NFR-SEC11)
คนที่ 2 — Frontend
 ติดตั้ง Next.js + Tailwind
 หน้า Login / PSU Passport Callback
 Session timeout warning UI
 Form Builder Drag & Drop (dnd-kit) + ตั้งเวลา open_at/close_at
 Form Scope Selector (faculty / university) — eila_admin เท่านั้น
 Template Scope แสดงผล (global badge / faculty badge)
 Import JSON: Upload → Validate Preview → Confirm Dialog (+ warning ถ้ามี answers)
 Export JSON: ปุ่ม Export โครงสร้างฟอร์ม
 Template Picker & Clone
 Copy Form feature (แสดงชัดว่า "copy เฉพาะโครงสร้าง ไม่มีคำตอบ")
 หน้าตอบฟอร์ม (Respondent) + Status + แสดงคำตอบเดิม

Closed + เคยตอบ → read-only mode + banner "หมดเวลาแล้ว — คำตอบของคุณถูกบันทึก"
Reopen banner "ฟอร์มเปิดรับคำตอบอีกครั้งแล้ว"


 Admin Dashboard + กราฟ (แยก Faculty)
 eila_admin หน้าจัดการ Faculty + Forms ทุก Faculty
 Audit Log Viewer (eila_admin)
 Optimistic locking conflict dialog (แสดง diff + Overwrite/Cancel)
 Error message display (validation errors)
 Email OTP modal สำหรับ Role Override (FR-U06)
 Executive Dashboard — Aggregated only, ไม่มี individual response — Phase 2
 In-app Notification (ระฆัง + Mark as Read) — Phase 2
12. Git Branch Strategy12.1 โครงสร้าง Branchmain
└── develop
    ├── feature/backend-xxx   (คนที่ 1)
    ├── feature/frontend-xxx  (คนที่ 2)
    └── hotfix/xxx            (กรณี Bug เร่งด่วน)
Branchวัตถุประสงค์ใครใช้Merge ไปที่mainProduction เท่านั้นทั้งคู่ (ตกลงกันก่อน)—developรวมงานล่าสุดก่อน Releaseทั้งคู่mainfeature/xxxงานแต่ละชิ้นแต่ละคนdevelophotfix/xxxแก้ Bug เร่งด่วนบน Productionทั้งคู่main และ develop❌ ห้าม push ตรงเข้า main เด็ดขาด12.2 Hotfix Branch Strategygit checkout main && git pull origin main
git checkout -b hotfix/fix-form-status-bug
git add . && git commit -m "fix: form status not closing on close_at"
git checkout main && git merge hotfix/fix-form-status-bug
git tag -a v1.x.y -m "hotfix: form status bug" && git push origin main --tags
git checkout develop && git merge hotfix/fix-form-status-bug && git push origin develop
git branch -d hotfix/fix-form-status-bug && git push origin --delete hotfix/fix-form-status-bug
12.3 Feature Branchesคนที่ 1 — Backendfeature/backend-setup
feature/backend-auth-psu
feature/backend-faculties-api
feature/backend-users-api           ← รวม base_role/override_role (v1.7)
feature/backend-forms-api           ← รวม university scope edit check (v1.7)
feature/backend-templates-api
feature/backend-responses-api       ← รวม cascade delete + copy form rule (v1.7)
feature/backend-import-export       ← รวม local copy rule (v1.7)
feature/backend-scheduler
feature/backend-audit-logging       ← unified hash formula (v1.7)
feature/backend-session-mgmt
feature/backend-security
feature/backend-role-override-otp   ← Email OTP 2FA (v1.6)
feature/backend-notifications       ← Phase 2 + retry fields (v1.7)
feature/backend-export-pdf-excel    ← Phase 2
คนที่ 2 — Frontendfeature/frontend-setup
feature/frontend-login
feature/frontend-form-builder
feature/frontend-form-scope         ← university scope edit restriction (v1.7)
feature/frontend-import-export-ui   ← local copy + cascade warning (v1.7)
feature/frontend-templates
feature/frontend-respondent         ← closed form read-only + reopen banner (v1.7)
feature/frontend-admin-dashboard
feature/frontend-executive-dashboard ← aggregated only, Phase 2 (v1.7)
feature/frontend-eila-admin
feature/frontend-audit-log-viewer
feature/frontend-session-timeout
feature/frontend-role-override-otp  ← Email OTP modal (v1.6)
feature/frontend-notifications      ← Phase 2
12.4 Flow การทำงานประจำวันgit checkout develop && git pull origin develop
git checkout -b feature/backend-forms-api
git add . && git commit -m "feat: add form CRUD endpoints"
git push origin feature/backend-forms-api
# เปิด Pull Request → develop แล้วให้อีกคน Review
12.5 Commit Message ConventionPrefixใช้เมื่อตัวอย่างfeat:เพิ่มฟีเจอร์ใหม่feat: add PSU Passport OAuth flowfix:แก้ Bugfix: form status not updating on close_athotfix:แก้ Bug เร่งด่วนบน Productionhotfix: resolve duplicate response submissionchore:Config / Setup / Dependencieschore: setup Fastify with PostgreSQLrefactor:ปรับโค้ด ไม่เพิ่มฟีเจอร์refactor: extract form validation to middlewaredocs:แก้ไข Documentationdocs: update SRS v1.7style:แก้ไข UI / CSS เท่านั้นstyle: adjust form builder layoutsecurity:Security-related changessecurity: add CSRF protection12.6 Pull Request Rules
ทุก feature/xxx ต้องเปิด PR → develop เสมอ ไม่ merge เอง
อีกคนต้อง Review และ Approve ก่อน Merge
hotfix/xxx ต้องเปิด PR 2 ใบ (→ main และ → develop)
Merge develop → main ทำเมื่อ Phase เสร็จสมบูรณ์เท่านั้น
13. Test Cases13.1 Authentication TestsTest IDDescriptionExpected ResultAUTH-01PSU Passport LoginUser auto-created with correct base_role + facultyAUTH-02Session timeout after 30 minUser redirected to loginAUTH-03Logout clears sessionUser cannot access protected routesAUTH-04Role override by eila_adminoverride_role updated + audit log created + user notified13.2 Form Visibility TestsTest IDDescriptionExpected ResultFORM-VIS-01faculty form visible to same facultyRespondent sees formFORM-VIS-02faculty form not visible to other facultyRespondent doesn't see formFORM-VIS-03university form visible to allAll respondents see formFORM-VIS-04faculty_admin sees only own faculty formsCannot see other faculty formsFORM-VIS-05executive sees university formForm appears in executive dashboard (aggregated)13.3 Form Edit Permission Tests ✏️ (New v1.7)Test IDDescriptionExpected ResultEDIT-01faculty_admin edits university scope formReturns 403 ForbiddenEDIT-02eila_admin edits university scope formEdit succeedsEDIT-03faculty_admin edits own faculty formEdit succeedsEDIT-04faculty_admin edits another faculty's formReturns 403 Forbidden13.4 Executive Access Tests ✏️ (New v1.7)Test IDDescriptionExpected ResultEXEC-01Executive tries to see individual responseReturns 403 ForbiddenEXEC-02Executive views dashboardSees aggregated data onlyEXEC-03Executive tries to submit form responseReturns 403 ForbiddenEXEC-04Executive export PDFExport contains aggregated data only, no user_id13.5 Security TestsTest IDDescriptionExpected ResultSEC-01CSRF token validationRequest without CSRF token rejectedSEC-02SQL injection attemptQuery parameterized, no injectionSEC-03XSS in form titleTitle escaped on outputSEC-04Rate limiting > 100 req/minReturns 429SEC-05faculty_admin access other faculty APIReturns 403 Forbidden13.6 Concurrent Editing TestsTest IDDescriptionExpected ResultCONC-01Two admins edit same formSecond save shows conflict dialog with diffCONC-02Optimistic locking version mismatchWarning displayed, user chooses overwrite or cancelCONC-03Conflict dialog overwriteAdmin's changes saved, version incremented13.7 Scheduler TestsTest IDDescriptionExpected ResultSCH-01Form opens at open_atStatus changes to 'open' within 5 minSCH-02Form closes at close_atStatus changes to 'closed' within 5 minSCH-03Reminder sent 3 days beforeEmail + in-app notification sent at 9 AM13.8 Email Failure TestsTest IDDescriptionExpected ResultEMAIL-01Email send fails first attemptRetry after 1 minute; next_retry_at setEMAIL-02Email send fails 3 timesMark as failed + notify admin via in-appEMAIL-03Email retry exponential backoffRetry at 1min, 5min, 15min intervals13.9 Form Versioning TestsTest IDDescriptionExpected ResultVER-01Form structure change creates versionNew record in form_versions tableVER-02Admin can view version historyList of versions with timestampsVER-03Admin can rollback to old versionNew form created from old snapshot13.10 Data Retention TestsTest IDDescriptionExpected ResultRET-01Data older than 2 years archivedScheduler moves data to archive tablesRET-02Archived data still queryableCan retrieve via admin interfaceRET-03Data older than 5 years deletableSoft delete or purge per policy13.11 Soft Delete TestsTest IDDescriptionExpected ResultDEL-01Deleted user has is_active=falseUser cannot login but data preservedDEL-02Queries filter inactive recordsis_active=true applied automaticallyDEL-03Faculty delete with existing formsDelete blocked if forms exist13.12 Role Override 2FA TestsTest IDDescriptionExpected ResultOTP-01eila_admin triggers role overrideEmail OTP sent to eila_admin PSU EmailOTP-02Correct OTP enteredoverride_role updated + audit log + user notificationOTP-03Wrong OTP entered 3 timesOverride blocked for 15 minutesOTP-04OTP expires after 5 minutesOTP rejected, must request new oneOTP-05target user receives notificationNotification sent after role changed13.13 Audit Log Hash Chain TestsTest IDDescriptionExpected ResultHASH-01First audit log recordprev_hash = '0'.repeat(64)HASH-02Chain integrity after 100 recordsAll hashes link correctly (verify endpoint)HASH-03Tamper detection (modify old_value)Modified record → chain verify failsHASH-04Audit log is append-onlyUPDATE/DELETE attempt returns permission error13.14 Cascade Delete Tests ✏️ (New v1.7)Test IDDescriptionExpected ResultCASCADE-01Delete question with existing answersWarning shown: "X คนตอบแล้ว"CASCADE-02Admin confirms question deleteQuestion + all answers deleted; audit log createdCASCADE-03Delete question with no answersQuestion deleted immediately, no warning13.15 Copy Form Tests ✏️ (New v1.7)Test IDDescriptionExpected ResultCOPY-01Copy form with existing responsesNew form has no responsesCOPY-02Copied form structureform_questions cloned correctlyCOPY-03copied_from fieldNew form has copied_from = original form idCOPY-04Edit copied formDoes not affect original form13.16 Import Ownership Tests ✏️ (New v1.7)Test IDDescriptionExpected ResultIMPORT-01faculty_admin imports JSON from another facultyNew form's faculty_id = importer's facultyIMPORT-02Edit imported formDoes not affect source file or source facultyIMPORT-03imported_from fieldShows original filename for reference14. Appendix14.1 Form Access Pseudocode ✏️ (Updated v1.7 — 3 Functions)// ─── 1. ใครเห็นฟอร์มใน Dashboard / Form List ───
function canUserSeeFormForDashboard(user: User, form: Form): boolean {
  if (user.effective_role === 'eila_admin') return true
  if (user.effective_role === 'executive') return true  // เห็นทุกฟอร์ม (aggregated)
  if (form.scope === 'university') return true

  if (form.scope === 'faculty') {
    if (user.effective_role === 'faculty_admin') {
      return user.faculty_id === form.faculty_id
    }
    // Respondent
    if (user.faculty_id === form.faculty_id) {
      const targetRoles = getFormTargetRoles(form.id)
      return targetRoles.includes(user.effective_role)
    }
  }
  return false
}

// ─── 2. ใครตอบฟอร์มได้ (Respondable) ───
function canUserRespondForm(user: User, form: Form): boolean {
  // executive, eila_admin, faculty_admin ตอบไม่ได้
  const adminRoles = ['eila_admin', 'faculty_admin', 'executive']
  if (adminRoles.includes(user.effective_role)) return false

  // ฟอร์มต้อง open
  if (form.status !== 'open') return false

  if (form.scope === 'university') return true  // ทุก Respondent ตอบได้

  if (form.scope === 'faculty') {
    if (user.faculty_id !== form.faculty_id) return false
    const targetRoles = getFormTargetRoles(form.id)
    return targetRoles.includes(user.effective_role)
  }
  return false
}

// ─── 3. ใครแก้ไขโครงสร้างฟอร์มได้ (Editable) ───
function canUserEditForm(user: User, form: Form): boolean {
  if (user.effective_role === 'eila_admin') return true  // eila_admin แก้ได้ทุกฟอร์ม

  if (user.effective_role === 'faculty_admin') {
    // faculty_admin แก้ได้เฉพาะ faculty scope ของตัวเอง
    return form.scope === 'faculty' && user.faculty_id === form.faculty_id
  }
  return false  // executive, teacher, staff, student แก้ไม่ได้
}
14.2 API Error Response Schema{
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
CodeHTTP StatusDescriptionVALIDATION_ERROR400Input validation failedUNAUTHORIZED401Not logged inFORBIDDEN403No permissionNOT_FOUND404Resource not foundCONFLICT409Version conflict (optimistic locking)RATE_LIMITED429Too many requestsINTERNAL_ERROR500Server error14.3 GlossaryTermDefinitionPSU PassportOAuth provider ของมหาวิทยาลัยFacultyคณะ/วิทยาลัย ในมหาวิทยาลัยRespondentผู้ตอบแบบประเมิน (teacher/staff/student)Form Scopeขอบเขตการมองเห็นฟอร์ม (faculty/university)Template Scopeขอบเขตการมองเห็น template (faculty/global)Optimistic LockingConcurrent editing strategy ด้วย version numberSoft Deleteการ "ลบ" โดยแค่ mark is_active=false ไม่ลบข้อมูลจริงHash ChainSHA-256 linked chain สำหรับ tamper-proof audit logEmail OTPOne-Time Password ส่งผ่าน PSU Email สำหรับ 2FAKMSKey Management Service สำหรับจัดการ encryption keybase_roleRole จาก PSU Passport ก่อนที่จะมี overrideoverride_roleRole ที่ eila_admin กำหนดทับ (NULLABLE)effective_roleRole ที่ระบบใช้จริง = override_role ?? base_rolelocal copyสำเนาฟอร์มที่เป็นอิสระ ผูกกับ faculty ผู้ import ไม่เชื่อมกับต้นทางaggregated dataข้อมูลรวม เช่น คะแนนเฉลี่ย, จำนวนผู้ตอบ — ไม่ระบุตัวบุคคลindividual responseข้อมูลคำตอบรายบุคคล ระบุ user_id ได้CASCADEการลบข้อมูลลูกตามโดยอัตโนมัติเมื่อข้อมูลแม่ถูกลบvisibilityใครมองเห็นฟอร์ม/ข้อมูลได้respondableใครสามารถ submit คำตอบได้editableใครสามารถแก้ไขโครงสร้างฟอร์มได้15. API Endpoints Specification15.1 AuthenticationMethodEndpointDescriptionAuthGET/api/auth/psuRedirect to PSU Passport OAuth❌GET/api/auth/callbackOAuth callback handler❌POST/api/auth/logoutLogout (clear session)✅GET/api/auth/meGet current user info (effective_role)✅15.2 FormsMethodEndpointDescriptionAuthGET/api/formsList forms (filtered by scope/role/faculty)✅GET/api/forms/:idGet form by ID✅POST/api/formsCreate new form✅ (admin)PUT/api/forms/:idUpdate form (with optimistic locking)✅ (editable)DELETE/api/forms/:idSoft delete form✅ (editable)POST/api/forms/:id/duplicateCopy form (structure only, no responses)✅ (admin)GET/api/forms/:id/versionsGet form version history✅ (admin)POST/api/forms/:id/restoreRestore form from version✅ (admin)15.3 ResponsesMethodEndpointDescriptionAuthGET/api/forms/:id/responsesList responses (admin: all; respondent: own only; executive: 403)✅POST/api/forms/:id/responsesSubmit response (Upsert)✅ (respondable)GET/api/responses/:idGet response by ID✅PUT/api/responses/:idUpdate response✅ (own only)15.4 TemplatesMethodEndpointDescriptionAuthGET/api/templatesList templates (faculty + global)✅POST/api/templatesCreate template✅ (admin)PUT/api/templates/:idUpdate template✅ (owner/eila_admin)DELETE/api/templates/:idDelete template✅ (owner/eila_admin)15.5 Admin (eila_admin only)MethodEndpointDescriptionAuthGET/api/admin/usersList all users✅ (eila_admin)POST/api/admin/usersCreate user✅ (eila_admin)PUT/api/admin/users/:idUpdate user✅ (eila_admin)DELETE/api/admin/users/:idSoft delete user✅ (eila_admin)GET/api/admin/facultiesList all faculties✅ (eila_admin)POST/api/admin/facultiesCreate faculty✅ (eila_admin)PUT/api/admin/faculties/:idUpdate faculty✅ (eila_admin)DELETE/api/admin/faculties/:idSoft delete faculty✅ (eila_admin)GET/api/admin/audit-logsList audit logs✅ (eila_admin)GET/api/admin/audit-logs/verifyVerify hash chain integrity✅ (eila_admin)POST/api/admin/users/:id/role-override/requestRequest Email OTP for role override✅ (eila_admin)POST/api/admin/users/:id/role-override/confirmConfirm OTP + execute role override✅ (eila_admin)DELETE/api/admin/users/:id/role-overrideRemove role override (revert to base_role)✅ (eila_admin)15.6 Export / ImportMethodEndpointDescriptionAuthGET/api/forms/:id/exportExport form structure as JSON✅ (admin)POST/api/forms/:id/importImport form structure from JSON (creates local copy)✅ (admin)GET/api/forms/:id/export/pdfExport results as PDF (executive = aggregated only)✅GET/api/forms/:id/export/xlsxExport results as Excel (executive = aggregated only)✅
Error Response Schema: ดู Section 14.2
สรุปการแก้ไขv1.6 — แก้ไข 5 ข้อจาก Final Sanity Check(รายละเอียดครบถ้วนใน v1.6)v1.7 — แก้ไข 10 ข้อจาก Clarification Review ✏️#Issueการแก้ไข1Executive เห็น individual responseExecutive เห็นเฉพาะ Aggregated Data; ไม่เห็น individual response; เพิ่ม EXEC-01–04 test cases2University scope edit rights ไม่ชัดเพิ่ม rule: university scope แก้ไขได้เฉพาะ eila_admin; "ทุกคนเห็น ≠ ทุกคนแก้ได้"; เพิ่ม EDIT-01–04 test cases3Import ownership ไม่ชัดเพิ่ม FR-IE10: Local Copy Rule — faculty_id ผูกกับ importer; imported_from = filename reference; IMPORT-01–03 test cases4audit_logs hash formula มี 2 แบบรวมเป็นสูตรเดียว: SHA256 รวม old_value + new_value + prev_hash + created_at5role override ขาด base/override structureเพิ่ม base_role, override_role, override_by, override_at, override_reason ใน users table; เพิ่ม DELETE /role-override endpoint6answers CASCADE ไม่ชัดเพิ่ม FR-R09: CASCADE + warning ก่อนลบ; CASCADE-01–03 test cases7Copy Form ไม่ชัดเรื่อง responsesเพิ่ม FR-R08: Copy = structure only, ไม่มี responses; COPY-01–04 test cases8notification_logs ขาด retry fieldsเพิ่ม next_retry_at, last_attempt_at ใน notification_logs schema9Pseudocode รวมฟังก์ชันเดียวแยกเป็น 3 functions: canUserSeeFormForDashboard, canUserRespondForm, canUserEditForm10UX rules ไม่ชัดเพิ่ม: closed form read-only view, reopen banner, conflict dialog (no timeout, overwrite = all fields), notification targetseila — Web Evaluation System | SRS v1.7 | 2026-04-24
Prince of Songkla University
✅ SRS v1.7 — ครบทั้ง 57 ข้อ (42 จาก v1.5 + 5 จาก v1.6 + 10 จาก v1.7)