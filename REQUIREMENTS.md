# eila — Software Requirements Specification (SRS)

> ระบบประเมินเว็บไซต์มหาวิทยาลัย / Web Evaluation System
> Prince of Songkla University
> Version 1.3 | Updated: 2026-04-23

---

## Changelog

| Version | วันที่ | สิ่งที่เปลี่ยน |
|---------|--------|--------------|
| 1.0 | 2026-04-23 | Initial SRS |
| 1.1 | 2026-04-23 | เพิ่ม Faculty Structure, Form-first Concept, Import/Export, แก้ DB Schema, ยืนยัน Status Flow |
| 1.2 | 2026-04-23 | เพิ่ม `faculties` table (แบบ B), Form Scope (faculty / university), Form Date Auto-close, Notification System |
| 1.3 | 2026-04-23 | เพิ่ม Git Branch Strategy (หัวข้อ 11) |

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์
eila คือระบบเว็บสำหรับประเมินเว็บไซต์ของมหาวิทยาลัย โดย Admin สามารถสร้างแบบประเมินแบบ Drag & Drop คล้าย Google Forms กำหนด Role และขอบเขต (Faculty / University) ที่รับฟอร์ม ตั้งเวลาเปิด-ปิดอัตโนมัติ Import/Export ฟอร์มได้ และดูผลลัพธ์ผ่าน Dashboard ผู้ใช้ทุกคน Login ผ่าน PSU Passport และระบบแยก Role อัตโนมัติ

### 1.2 ขอบเขตของระบบ (Scope)
- สร้างและจัดการแบบประเมิน (Form) แบบ Form-first คล้าย Google Forms
- ระบบ Authentication ผ่าน PSU Passport (OAuth)
- กำหนดสิทธิ์การเข้าถึงตาม Role และ Faculty
- Form Scope: `faculty` (เฉพาะคณะ) และ `university` (ทั้งมหาวิทยาลัย)
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
| Authentication | PSU Passport (OAuth) |
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
- สร้างฟอร์มได้ทั้ง `faculty` scope และ `university` scope
- ดู Dashboard และ Export ได้ทุก Faculty
- มีได้ 1–2 คนเท่านั้น
- `faculty_id = NULL` (ไม่ผูกกับ Faculty ใด)

### 2.2 faculty_admin
- Admin ประจำแต่ละ Faculty
- สร้างได้เฉพาะฟอร์ม `faculty` scope ของตัวเอง
- เห็นข้อมูลและ Dashboard เฉพาะ Faculty ตัวเอง
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
- เห็นเฉพาะฟอร์มที่ถูกกำหนดให้ Role และ Faculty ตัวเอง (รวมถึงฟอร์ม `university` scope)
- แก้ไขคำตอบได้จนกว่าฟอร์มจะ `closed`
- ไม่เห็นคำตอบของคนอื่น

---

## 3. Authentication

### 3.1 PSU Passport (OAuth)
- ไม่มีระบบ Register หรือจัดการรหัสผ่านเอง
- ผู้ใช้ทุกคน Login ผ่าน PSU Passport
- PSU Passport ส่ง Role + Faculty มาให้อัตโนมัติ

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
└── ไม่มี → Auto-create / Update ข้อมูลจาก PSU Passport
(role: student / teacher / staff, faculty จาก PSU)
---

## 4. Functional Requirements

### 4.1 Form Builder (Form-first แบบ Google Forms)

- **FR-F01** Admin สร้างฟอร์มใหม่แบบเปล่าได้ โดยไม่ต้องมี Template
- **FR-F02** รองรับการ Drag & Drop เพื่อเรียงลำดับคำถาม
- **FR-F03** สามารถเพิ่ม / ลบ / แก้ไขคำถามใน Form ได้
- **FR-F04** สามารถกำหนด URL เว็บไซต์ที่ต้องการประเมินได้
- **FR-F05** สามารถกำหนด Role ที่จะรับฟอร์มได้ (เลือกได้หลาย Role)
- **FR-F06** สามารถเปิด / ปิดฟอร์มได้ตลอดเวลา
- **FR-F07** ฟอร์มมีสถานะ 3 สถานะ ได้แก่ `draft` / `open` / `closed`
- **FR-F08** สามารถ Copy ฟอร์มเก่าไปสร้างใหม่และแก้ไขได้

#### Form Scope
- **FR-F09** ฟอร์มมี Scope 2 แบบ
  - `faculty` — สร้างโดย faculty_admin หรือ eila_admin → Respondent เห็นเฉพาะคนใน Faculty นั้น
  - `university` — สร้างโดย eila_admin เท่านั้น → Respondent ทุก Faculty เห็น (เว็บรวมของมหาวิทยาลัย)
- **FR-F10** faculty_admin สร้างได้เฉพาะ `faculty` scope
- **FR-F11** eila_admin สร้างได้ทั้ง `faculty` scope และ `university` scope

#### Form Date (Auto-close)
- **FR-F12** Admin สามารถกำหนด `open_at` และ `close_at` ล่วงหน้าได้
- **FR-F13** ระบบเปลี่ยน Status เป็น `open` อัตโนมัติเมื่อถึงเวลา `open_at`
- **FR-F14** ระบบเปลี่ยน Status เป็น `closed` อัตโนมัติเมื่อถึงเวลา `close_at`
- **FR-F15** Admin สามารถแก้ไข `close_at` เพื่อขยายเวลาได้ แม้ฟอร์มจะ `open` หรือ `closed` แล้ว
- **FR-F16** `open_at` และ `close_at` เป็น Optional — ถ้าไม่กำหนด Admin ต้องเปิด/ปิดเอง

#### Status Flow

draft ⇄ open → closed
↑      |
└──────┘ (เปิดใหม่ได้)draft  → open   ✅ ได้ (กดเอง หรือระบบเปิดอัตโนมัติตาม open_at)
open   → draft  ✅ ได้ (ดึงกลับมาแก้ไข)
open   → closed ✅ ได้ (กดเอง หรือระบบปิดอัตโนมัติตาม close_at)
closed → open   ✅ ได้ (เปิดรอบใหม่ หรือขยายเวลา)ถ้าฟอร์ม closed → Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
---

### 4.2 Template System

- **FR-T01** Admin สามารถสร้าง Template ชุดคำถามสำเร็จรูปได้
- **FR-T02** เมื่อ Admin เลือก Template มาสร้างฟอร์ม ระบบจะ Clone คำถามทั้งหมดเข้า `form_questions` ทันที
- **FR-T03** คำถามที่ Clone มาสามารถแก้ไขได้อิสระ ไม่กระทบ Template ต้นฉบับ
- **FR-T04** Admin สามารถแก้ไข / ลบ Template ได้

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
- **FR-IE06** หากฟอร์มมีคำถามอยู่แล้ว ระบบถามว่า "เพิ่มต่อท้าย" หรือ "แทนที่ทั้งหมด"
- **FR-IE07** รองรับไฟล์ `.json` จากระบบอื่นที่ไม่ใช่ eila หาก Format ถูกต้อง
- **FR-IE08** หาก Format ผิด ระบบแจ้ง Error พร้อมระบุว่าผิดตรงไหน
- **FR-IE09** คำถามที่ Import มาแล้วสามารถแก้ไข / ลบ / เรียงลำดับใหม่ได้อิสระ

#### 📤 Export ผลลัพธ์
- **FR-IE10** Admin และ Executive สามารถ Export ผลลัพธ์เป็น `.pdf` ได้
- **FR-IE11** Admin และ Executive สามารถ Export ผลลัพธ์เป็น `.xlsx` ได้

---

### 4.5 การตอบฟอร์ม (Response)

- **FR-R01** Respondent เห็นเฉพาะฟอร์มที่ถูกกำหนดให้ Role และ Faculty ตัวเอง (รวมถึงฟอร์ม `university` scope)
- **FR-R02** แสดงสถานะฟอร์ม: ยังไม่ตอบ / ตอบแล้ว / หมดเวลาแล้ว
- **FR-R03** Respondent สามารถแก้ไขคำตอบได้จนกว่าฟอร์มจะ `closed`
- **FR-R04** เมื่อฟอร์ม `closed` Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
- **FR-R05** ระบบเก็บเฉพาะคำตอบล่าสุด (Upsert) ไม่เก็บ History การแก้ไข
- **FR-R06** Respondent ไม่สามารถเห็นคำตอบของคนอื่นได้

---

### 4.6 Dashboard & Analytics

- **FR-D01** faculty_admin ดูผลลัพธ์ได้เฉพาะฟอร์มใน Faculty ตัวเอง
- **FR-D02** eila_admin และ executive ดู Dashboard ได้ทุกฟอร์มทุก Faculty
- **FR-D03** แสดงคะแนนเฉลี่ยของแต่ละคำถาม
- **FR-D04** แสดงกราฟสรุปผลภาพรวม (แบบ Google Forms: Bar Chart คะแนน, สรุป Short Text)
- **FR-D05** แสดงจำนวนผู้ตอบทั้งหมด และ % ของผู้ที่ยังไม่ตอบ
- **FR-D06** แสดงความคิดเห็น (Short Text) ทั้งหมด

---

### 4.7 User Management

- **FR-U01** eila_admin สามารถเพิ่ม / ลบ / แก้ไข faculty_admin และ executive ได้
- **FR-U02** eila_admin กำหนด Faculty ให้ faculty_admin ได้ (เลือกจาก `faculties` table)
- **FR-U03** eila_admin จัดการ `faculties` table ได้ (เพิ่ม / ลบ / แก้ไขคณะ)
- **FR-U04** eila_admin ดูภาพรวมผู้ใช้งานทั้งระบบได้

---

### 4.8 Notification System (Phase 2)

ช่องทาง: **Email (SMTP PSU) + In-app (ไอคอนระฆังในระบบ)**

| รหัส | เหตุการณ์ | ผู้รับ | ช่องทาง |
|---|---|---|---|
| FR-N01 | Admin เผยแพร่ฟอร์ม (status → `open`) | Respondent ที่เกี่ยวข้องทุกคน | Email + In-app |
| FR-N02 | เหลือ 3 วันก่อนปิด (`close_at`) + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N03 | เหลือ 1 วันก่อนปิด (`close_at`) + ยังไม่ตอบ | Respondent ที่ยังไม่ตอบ | Email + In-app |
| FR-N04 | Admin ขยายเวลา (`close_at` ถูกแก้ไข) | Respondent ที่เกี่ยวข้องทุกคน | Email + In-app |
| FR-N05 | Respondent ส่งฟอร์มสำเร็จ | Respondent คนนั้น | In-app เท่านั้น |
| FR-N06 | ฟอร์ม `closed` อัตโนมัติตาม Scheduler | faculty_admin เจ้าของฟอร์ม | In-app เท่านั้น |

- **FR-N07** In-app Notification แสดงเป็นไอคอนระฆัง บอกจำนวนที่ยังไม่อ่าน
- **FR-N08** ผู้ใช้สามารถกด Mark as Read ได้
- **FR-N09** Email แจ้งเตือนมีลิงก์ตรงไปยังฟอร์มนั้น

---

## 5. Non-Functional Requirements

- **NFR-01** Phase 1 ใช้ Single Role ต่อ User (Enum) รองรับ Multi-role ในอนาคต โดย Migrate เป็น `user_roles` table
- **NFR-02** ระบบต้องรองรับการใช้งานบน Mobile (Responsive)
- **NFR-03** ระบบต้องมีการตรวจสอบสิทธิ์ทุก API Request (Authorization)
- **NFR-04** ข้อมูลคำตอบต้องถูกต้องและ Tamper-proof
- **NFR-05** ระบบต้องรองรับ Admin หลายคนพร้อมกัน
- **NFR-06** ไฟล์ Import ต้องผ่านการ Validate Format ก่อนนำเข้าระบบเสมอ
- **NFR-07** ระบบต้องมี Scheduler (Cron Job) สำหรับเปลี่ยน Status ฟอร์มอัตโนมัติตาม `open_at` / `close_at` ทุก 1 นาที
- **NFR-08** ระบบต้องมี Scheduler สำหรับตรวจสอบและส่ง Notification เตือนก่อนปิดฟอร์ม (ทุก 1 ชั่วโมง)

---

## 6. Database Schema

### faculties
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| name_th | String | ชื่อคณะภาษาไทย |
| name_en | String | ชื่อคณะภาษาอังกฤษ |
| created_at | DateTime | วันที่สร้าง |

### users
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| psu_passport_id | String | ID จาก PSU Passport |
| name | String | ชื่อ-นามสกุล |
| email | String | อีเมลมหาวิทยาลัย |
| role | Enum | eila_admin / faculty_admin / executive / teacher / staff / student |
| faculty_id | UUID | FK → faculties (NULL สำหรับ eila_admin) |
| created_at | DateTime | วันที่สร้าง |

### templates
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| name | String | ชื่อ Template |
| description | String | คำอธิบาย |
| created_by | UUID | FK → users |
| created_at | DateTime | วันที่สร้าง |

### template_questions
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| template_id | UUID | FK → templates |
| question_text | String | ข้อคำถาม |
| question_type | Enum | rating / short_text |
| order | Integer | ลำดับ |
| required | Boolean | บังคับตอบ |

### forms
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| title | String | ชื่อฟอร์ม |
| website_url | String | URL เว็บที่ประเมิน |
| faculty_id | UUID | FK → faculties (NULL ถ้า scope = university) |
| scope | Enum | faculty / university |
| template_id | UUID | FK → templates (NULLABLE) |
| copied_from | UUID | FK → forms (NULLABLE) |
| imported_from | String | ชื่อไฟล์ที่ Import มา (NULLABLE) |
| status | Enum | draft / open / closed |
| open_at | DateTime | เวลาเปิดอัตโนมัติ (NULLABLE) |
| close_at | DateTime | เวลาปิดอัตโนมัติ (NULLABLE) |
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

> **หมายเหตุ:** คำถามทุกข้ออยู่ใน `form_questions` เสมอ ไม่ว่าจะสร้างเอง / Clone จาก Template / Import จาก JSON การแก้ไขใน `form_questions` ไม่กระทบ Template ต้นฉบับ

### form_target_roles
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| role | Enum | teacher / staff / student |

### responses
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| user_id | UUID | FK → users |
| submitted_at | DateTime | วันที่ส่งครั้งแรก |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### answers
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| response_id | UUID | FK → responses |
| question_id | UUID | FK → form_questions |
| rating_value | Integer | ถ้าเป็น Rating (1–5) |
| text_value | String | ถ้าเป็น Short Text |

> **หมายเหตุ:** ระบบใช้ Upsert — เก็บเฉพาะคำตอบล่าสุด ไม่มี Version History

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

---

## 7. Import/Export JSON Specification

### 7.1 โครงสร้าง JSON มาตรฐาน

```json
{
  "eila_version": "1.3",
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
7.2 Validation RulesFieldRuleError Messagequestionsต้องเป็น Array"questions ต้องเป็น Array"question_textต้องมีค่า ไม่ว่าง"question_text ข้อที่ N ว่างเปล่า"question_typeต้องเป็น rating หรือ short_text"question_type ข้อที่ N ไม่ถูกต้อง"requiredต้องเป็น boolean"required ข้อที่ N ต้องเป็น true/false"orderต้องเป็น Integer"order ข้อที่ N ต้องเป็นตัวเลข"7.3 Import Conflict Flowมีคำถามในฟอร์มอยู่แล้ว + Import ใหม่
          ↓
ระบบแสดง Dialog
┌─────────────────────────────┐
│ ฟอร์มมีคำถามอยู่แล้ว 5 ข้อ  │
│ ต้องการ Import 8 คำถามใหม่  │
│                             │
│ [เพิ่มต่อท้าย] [แทนที่ทั้งหมด] │
└─────────────────────────────┘
8. หน้าเว็บ (Pages)ทั่วไปPathคำอธิบาย/Landing Page + ปุ่ม Login/auth/callbackPSU Passport OAuth Callbackeila_adminPathคำอธิบาย/eila-admin/dashboardภาพรวมระบบทั้งหมดทุก Faculty/eila-admin/usersจัดการผู้ใช้ทุก Role/eila-admin/facultiesจัดการ Faculty (เพิ่ม / ลบ / แก้ไข)faculty_adminPathคำอธิบาย/admin/dashboardสรุปภาพรวมฟอร์มของ Faculty ตัวเอง/admin/formsรายการฟอร์มทั้งหมดของ Faculty/admin/forms/createสร้างฟอร์มใหม่ (Form-first)/admin/forms/[id]/editแก้ไขฟอร์ม + Drag & Drop + Import/Export + ตั้งเวลา/admin/forms/[id]/copyCopy ฟอร์มไปสร้างใหม่/admin/forms/[id]/resultsดูผลลัพธ์ + Export PDF/Excel/admin/templatesรายการ Template ทั้งหมด/admin/templates/createสร้าง Template ใหม่/admin/templates/[id]/editแก้ไข TemplateexecutivePathคำอธิบาย/executive/dashboardDashboard ทุกฟอร์มทุก Faculty/executive/forms/[id]/resultsดูผลลัพธ์ + ExportRespondentPathคำอธิบาย/homeรายการฟอร์มที่ได้รับตาม Role + Faculty พร้อม Status/forms/[id]หน้าตอบฟอร์ม (ถ้าตอบแล้ว → แสดงคำตอบเดิมให้แก้ไขได้)/forms/[id]/doneหน้ายืนยันส่งแล้ว9. แผนการพัฒนา (Development Phases)Phase 1 — MVP
PSU Passport Login + Role Resolution + Auto-create User
6 Role พร้อม Faculty Scope
faculties table + eila_admin จัดการ Faculty
Form Builder แบบ Form-first (Drag & Drop)
Form Scope: faculty / university
Form Date: open_at / close_at + Auto-close Scheduler
Template System (Clone เข้า form_questions)
Copy ฟอร์มเก่า
Import / Export JSON (โครงสร้างฟอร์ม)
ตอบฟอร์มตาม Role + Scope + Status
ดูผล Dashboard แยก Faculty (Google Forms style)
Phase 2 — ปรับปรุง
Export PDF & Excel (ผลลัพธ์)
กราฟ Analytics (Bar Chart, สรุป Short Text)
Dashboard ผู้บริหาร (Executive)
Notification System (Email + In-app)
Phase 3 — ขยาย
เพิ่มประเภทคำถาม (ปรนัย / Dropdown)
eila_admin Panel เต็มรูปแบบ
ประวัติ / Audit Log
Multi-role Support (Migrate user_roles table)
10. การแบ่งงาน (Team)คนที่ 1 — Backend + Auth
ติดตั้ง Fastify + PostgreSQL
เชื่อม PSU Passport OAuth + Role Resolution + Auto-create User
API: faculties CRUD
API: users / roles / permissions / faculty scope
API: forms / templates / template_questions / form_questions
API: Form Scope (faculty / university) + Date (open_at, close_at)
API: responses / answers (Upsert)
API: Import JSON (Validate + Insert into form_questions)
API: Export JSON (Form Structure)
Scheduler: Auto open/close ตาม open_at / close_at
Scheduler: Notification trigger (3 วัน / 1 วันก่อนปิด) — Phase 2
Export PDF (PDF-lib) + Excel (ExcelJS) — Phase 2
Email Notification (Nodemailer) — Phase 2
ระบบสิทธิ์ทั้ง 6 Role พร้อม Faculty Scope
คนที่ 2 — Frontend
ติดตั้ง Next.js + Tailwind
หน้า Login / PSU Passport Callback
Form Builder Drag & Drop (dnd-kit) + ตั้งเวลา open_at/close_at
Form Scope Selector (faculty / university)
Import JSON: Upload → Validate Preview → Confirm Dialog
Export JSON: ปุ่ม Export โครงสร้างฟอร์ม
Template Picker & Clone
Copy Form feature
หน้าตอบฟอร์ม (Respondent) + Status + แสดงคำตอบเดิม
Admin Dashboard + กราฟ Google Forms style (แยก Faculty)
Executive Dashboard — Phase 2
In-app Notification (ระฆัง + Mark as Read) — Phase 2
eila_admin หน้าจัดการ Faculty
11. Git Branch Strategy11.1 โครงสร้าง Branchmain
└── develop
    ├── feature/backend-xxx   (คนที่ 1)
    └── feature/frontend-xxx  (คนที่ 2)
Branchวัตถุประสงค์ใครใช้Merge ไปที่mainProduction เท่านั้นทั้งคู่ (ตกลงกันก่อน)—developรวมงานล่าสุดก่อน Releaseทั้งคู่mainfeature/xxxงานแต่ละชิ้นแต่ละคนdevelop
❌ ห้าม push ตรงเข้า main เด็ดขาด
11.2 Feature Branches ตามแผนงานคนที่ 1 — Backendfeature/backend-setup
feature/backend-auth-psu
feature/backend-faculties-api
feature/backend-users-api
feature/backend-forms-api
feature/backend-templates-api
feature/backend-responses-api
feature/backend-import-export
feature/backend-scheduler
feature/backend-notifications     ← Phase 2
feature/backend-export-pdf-excel  ← Phase 2
คนที่ 2 — Frontendfeature/frontend-setup
feature/frontend-login
feature/frontend-form-builder
feature/frontend-form-scope
feature/frontend-import-export-ui
feature/frontend-templates
feature/frontend-respondent
feature/frontend-admin-dashboard
feature/frontend-eila-admin
feature/frontend-executive-dashboard  ← Phase 2
feature/frontend-notifications        ← Phase 2
11.3 Flow การทำงานประจำวัน# 1. ดึง develop ล่าสุดก่อนเริ่มงาน
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
11.4 Commit Message ConventionPrefixใช้เมื่อตัวอย่างfeat:เพิ่มฟีเจอร์ใหม่feat: add PSU Passport OAuth flowfix:แก้ Bugfix: form status not updating on close_atchore:Config / Setup / Dependencieschore: setup Fastify with PostgreSQLrefactor:ปรับโค้ด ไม่เพิ่มฟีเจอร์refactor: extract form validation to middlewaredocs:แก้ไข Documentationdocs: update SRS v1.3style:แก้ไข UI / CSS เท่านั้นstyle: adjust form builder layout11.5 Pull Request Rules
ทุก feature branch ต้อง เปิด PR → develop เสมอ ไม่ merge เอง
อีกคนต้อง Review และ Approve ก่อน Merge
ถ้า Conflict ให้คน สร้าง PR เป็นคนแก้เอง
Merge develop → main ทำเมื่อ Phase เสร็จสมบูรณ์ เท่านั้น
eila — Web Evaluation System | SRS v1.3 | 2026-04-23
Prince of Songkla University