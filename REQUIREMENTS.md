# eila — Software Requirements Specification (SRS)

> ระบบประเมินเว็บไซต์มหาวิทยาลัย / Web Evaluation System
> Prince of Songkla University
> Version 1.1 | Updated: 2026-04-23

---

## Changelog

| Version | วันที่ | สิ่งที่เปลี่ยน |
|---------|--------|--------------|
| 1.0 | 2026-04-23 | Initial SRS |
| 1.1 | 2026-04-23 | เพิ่ม Faculty Structure, Form-first Concept, Import/Export, แก้ DB Schema, ยืนยัน Status Flow |

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์
eila คือระบบเว็บสำหรับประเมินเว็บไซต์ของมหาวิทยาลัย โดย Admin สามารถสร้างแบบประเมินแบบ Drag & Drop คล้าย Google Forms กำหนด Role ที่รับฟอร์ม Import/Export ฟอร์มได้ และดูผลลัพธ์ผ่าน Dashboard ผู้ใช้ทุกคน Login ผ่าน PSU Passport และระบบแยก Role อัตโนมัติ

### 1.2 ขอบเเขตของระบบ (Scope)
- สร้างและจัดการแบบประเมิน (Form) แบบ Form-first คล้าย Google Forms
- ระบบ Authentication ผ่าน PSU Passport (OAuth)
- กำหนดสิทธิ์การเข้าถึงตาม Role และ Faculty
- Import/Export โครงสร้างฟอร์ม (.json) และผลลัพธ์ (.pdf / .xlsx)
- แสดงผลลัพธ์ผ่าน Dashboard แยกตาม Faculty

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
- จัดการผู้ใช้ทุก Role รวมถึง executive
- สร้าง / แก้ไข / ลบฟอร์มได้ทุก Faculty
- ดู Dashboard และ Export ได้ทุก Faculty
- มีได้ 1–2 คนเท่านั้น
- faculty = NULL (ไม่ผูกกับ Faculty ใด)

### 2.2 faculty_admin
- Admin ประจำแต่ละ Faculty
- สร้าง / แก้ไข / ลบฟอร์มได้เฉพาะ Faculty ตัวเอง
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
- Login ผ่าน PSU Passport
- ระบบกำหนด Role อัตโนมัติจากรหัสที่ Login
- เห็นเฉพาะฟอร์มที่ Admin กำหนดให้ Role ตัวเอง
- แก้ไขคำตอบได้จนกว่า Admin จะปิดฟอร์ม
- ไม่เห็นคำตอบของคนอื่น

---

## 3. Authentication

### 3.1 PSU Passport (OAuth)
- ไม่มีระบบ Register หรือจัดการรหัสผ่านเอง
- ผู้ใช้ทุกคน Login ผ่าน PSU Passport
- ระบบแยก Role อัตโนมัติจากรหัสที่ Login

รหัสนักศึกษา  →  student
รหัสอาจารย์    →  teacher
รหัสบุคลากร    →  staff
กำหนดโดย eila_admin  →  executive / faculty_admin / eila_admin
### 3.2 Role Resolution Flow
เมื่อ User Login ระบบจะตรวจสอบตามลำดับดังนี้

PSU Passport Login
↓
ดึง psu_passport_id
↓
เช็ค users table ว่ามีการ Override role ไหม?
├── มี Override → ใช้ role จาก DB (executive / faculty_admin / eila_admin)
└── ไม่มี → ใช้ role จาก PSU Passport (student / teacher / staff)
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

#### Status Flow

draft ⇄ open → closed
↑      |
└──────┘ (เปิดใหม่ได้)
draft  → open   ✅ ได้
open   → draft  ✅ ได้ (ดึงกลับมาแก้ไข)
open   → closed ✅ ได้
closed → open   ✅ ได้ (เปิดรอบใหม่)
ถ้าฟอร์ม closed แล้ว → Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"

### 4.2 Template System

- **FR-T01** Admin สามารถสร้าง Template ชุดคำถามสำเร็จรูปได้
- **FR-T02** เมื่อ Admin เลือก Template มาสร้างฟอร์ม ระบบจะ Clone คำถามทั้งหมดเข้า form_questions ทันที
- **FR-T03** คำถามที่ Clone มาสามารถแก้ไขได้อิสระ ไม่กระทบ Template ต้นฉบับ
- **FR-T04** Admin สามารถแก้ไข / ลบ Template ได้

### 4.3 ประเภทคำถาม (Question Types)

- **FR-Q01** Rating Scale (1–5 ดาว)
- **FR-Q02** Short Text (ข้อความสั้น / ความคิดเห็น)
- **FR-Q03** สามารถกำหนดได้ว่าคำถามข้อนั้นบังคับตอบหรือไม่
- **FR-Q04** สามารถเรียงลำดับคำถามได้อิสระด้วย Drag & Drop

### 4.4 Import / Export

#### 📤 Export โครงสร้างฟอร์ม (Form Structure Export)
- **FR-IE01** Admin สามารถ Export โครงสร้างฟอร์มออกเป็นไฟล์ `.json` ได้
- **FR-IE02** ไฟล์ `.json` ที่ Export มีเฉพาะโครงสร้างคำถาม ไม่มีคำตอบของ User
- **FR-IE03** ไฟล์ `.json` มีโครงสร้างดังนี้

```json
{
  "eila_version": "1.1",
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
📥 Import ฟอร์ม (Form Import)
FR-IE04 Admin สามารถ Import ไฟล์ .json เพื่อนำคำถามเข้าฟอร์มได้
FR-IE05 ระบบ Preview รายการคำถามที่จะ Import ให้ Admin ยืนยันก่อนเสมอ
FR-IE06 หากฟอร์มมีคำถามอยู่แล้ว ระบบถามว่า "เพิ่มต่อท้าย" หรือ "แทนที่ทั้งหมด"
FR-IE07 รองรับไฟล์ .json จากระบบอื่นที่ไม่ใช่ EILA หาก Format ถูกต้อง
FR-IE08 หาก Format ผิด ระบบแจ้ง Error พร้อมระบุว่าผิดตรงไหน
FR-IE09 คำถามที่ Import มาแล้วสามารถแก้ไข / ลบ / เรียงลำดับใหม่ได้อิสระ
📤 Export ผลลัพธ์ (Results Export)
FR-IE10 Admin และ Executive สามารถ Export ผลลัพธ์เป็น .pdf ได้
FR-IE11 Admin และ Executive สามารถ Export ผลลัพธ์เป็น .xlsx ได้
4.5 การตอบฟอร์ม (Response)
FR-R01 Respondent เห็นเฉพาะฟอร์มที่ถูกกำหนดให้ Role ตัวเอง
FR-R02 แสดงสถานะฟอร์ม: ยังไม่ตอบ / ตอบแล้ว / หมดเวลาแล้ว
FR-R03 Respondent สามารถแก้ไขคำตอบได้จนกว่าฟอร์มจะ closed
FR-R04 เมื่อฟอร์ม closed Respondent เห็นข้อความ "หมดเวลาการประเมินแล้ว"
FR-R05 ระบบเก็บเฉพาะคำตอบล่าสุด (Upsert) ไม่เก็บ History การแก้ไข
FR-R06 Respondent ไม่สามารถเห็นคำตอบของคนอื่นได้
4.6 Dashboard & Analytics
FR-D01 faculty_admin ดูผลลัพธ์ได้เฉพาะฟอร์มใน Faculty ตัวเอง
FR-D02 eila_admin และ executive ดู Dashboard ได้ทุกฟอร์มทุก Faculty
FR-D03 แสดงคะแนนเฉลี่ยของแต่ละคำถาม
FR-D04 แสดงกราฟสรุปผลภาพรวม
FR-D05 แสดงจำนวนผู้ตอบทั้งหมด
FR-D06 แสดงความคิดเห็น (Short Text) ทั้งหมด
4.7 User Management
FR-U01 eila_admin สามารถเพิ่ม / ลบ / แก้ไข faculty_admin และ executive ได้
FR-U02 eila_admin กำหนด Faculty ให้ faculty_admin ได้
FR-U03 eila_admin ดูภาพรวมผู้ใช้งานทั้งระบบได้
5. Non-Functional Requirements
NFR-01 Phase 1 ใช้ Single Role ต่อ User (Enum) รองรับ Multi-role ในอนาคต โดย Migrate เป็น user_roles table
NFR-02 ระบบต้องรองรับการใช้งานบน Mobile (Responsive)
NFR-03 ระบบต้องมีการตรวจสอบสิทธิ์ทุก API Request (Authorization)
NFR-04 ข้อมูลคำตอบต้องถูกต้องและ Tamper-proof
NFR-05 ระบบต้องรองรับ Admin หลายคนพร้อมกัน
NFR-06 ไฟล์ Import ต้องผ่านการ Validate Format ก่อนนำเข้าระบบเสมอ
6. Database SchemausersFieldTypeหมายเหตุidUUIDPrimary Keypsu_passport_idStringID จาก PSU PassportnameStringชื่อ-นามสกุลemailStringอีเมลมหาวิทยาลัยroleEnumeila_admin / faculty_admin / executive / teacher / staff / studentfacultyStringคณะ / หน่วยงาน (NULL สำหรับ eila_admin)created_atDateTimeวันที่สร้างtemplatesFieldTypeหมายเหตุidUUIDPrimary KeynameStringชื่อ TemplatedescriptionStringคำอธิบายcreated_byUUIDFK → userscreated_atDateTimeวันที่สร้างtemplate_questionsFieldTypeหมายเหตุidUUIDPrimary Keytemplate_idUUIDFK → templatesquestion_textStringข้อคำถามquestion_typeEnumrating / short_textorderIntegerลำดับrequiredBooleanบังคับตอบformsFieldTypeหมายเหตุidUUIDPrimary KeytitleStringชื่อฟอร์มwebsite_urlStringURL เว็บที่ประเมินfacultyStringFaculty เจ้าของฟอร์มtemplate_idUUIDFK → templates (NULLABLE — ไม่บังคับใช้ Template)copied_fromUUIDFK → forms (NULLABLE — ถ้า Copy มาจากฟอร์มอื่น)imported_fromStringชื่อไฟล์ที่ Import มา (NULLABLE)statusEnumdraft / open / closedcreated_byUUIDFK → userscreated_atDateTimeวันที่สร้างupdated_atDateTimeวันที่แก้ไขล่าสุดform_questionsFieldTypeหมายเหตุidUUIDPrimary Keyform_idUUIDFK → formsquestion_textStringข้อคำถามquestion_typeEnumrating / short_textorderIntegerลำดับ (Drag & Drop)requiredBooleanบังคับตอบ
หมายเหตุ: คำถามทุกข้ออยู่ใน form_questions เสมอ ไม่ว่าจะสร้างเอง / Clone จาก Template / Import จาก JSON การแก้ไขใน form_questions ไม่กระทบ Template ต้นฉบับ
form_target_rolesFieldTypeหมายเหตุidUUIDPrimary Keyform_idUUIDFK → formsroleEnumteacher / staff / studentresponsesFieldTypeหมายเหตุidUUIDPrimary Keyform_idUUIDFK → formsuser_idUUIDFK → userssubmitted_atDateTimeวันที่ส่งครั้งแรกupdated_atDateTimeวันที่แก้ไขล่าสุดanswersFieldTypeหมายเหตุidUUIDPrimary Keyresponse_idUUIDFK → responsesquestion_idUUIDFK → form_questionsrating_valueIntegerถ้าเป็น Rating (1–5)text_valueStringถ้าเป็น Short Text
หมายเหตุ: ระบบใช้ Upsert — เก็บเฉพาะคำตอบล่าสุด ไม่มี Version History
7. Import/Export JSON Specification7.1 โครงสร้าง JSON มาตรฐาน{
  "eila_version": "1.1",
  "form_title": "ชื่อฟอร์ม",
  "exported_at": "2026-04-23T10:00:00Z",
  "questions": [
    {
      "order": 1,
      "question_text": "ข้อคำถาม",
      "question_type": "rating",
      "required": true
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
│ [เพิ่มต่อท้าย]  [แทนที่ทั้งหมด] │
└─────────────────────────────┘
8. หน้าเว็บ (Pages)ทั่วไปPathคำอธิบาย/Landing Page + ปุ่ม Login/auth/callbackPSU Passport OAuth Callbackeila_adminPathคำอธิบาย/eila-admin/dashboardภาพรวมระบบทั้งหมดทุก Faculty/eila-admin/usersจัดการผู้ใช้ทุก Role/eila-admin/facultiesจัดการ Faculty Adminfaculty_adminPathคำอธิบาย/admin/dashboardสรุปภาพรวมฟอร์มของ Faculty ตัวเอง/admin/formsรายการฟอร์มทั้งหมดของ Faculty/admin/forms/createสร้างฟอร์มใหม่ (Form-first)/admin/forms/[id]/editแก้ไขฟอร์ม + Drag & Drop + Import/Export/admin/forms/[id]/copyCopy ฟอร์มไปสร้างใหม่/admin/forms/[id]/resultsดูผลลัพธ์ + Export PDF/Excel/admin/templatesรายการ Template ทั้งหมด/admin/templates/createสร้าง Template ใหม่/admin/templates/[id]/editแก้ไข TemplateexecutivePathคำอธิบาย/executive/dashboardDashboard ทุกฟอร์มทุก Faculty/executive/forms/[id]/resultsดูผลลัพธ์ + ExportRespondentPathคำอธิบาย/homeรายการฟอร์มที่ได้รับตาม Role พร้อม Status/forms/[id]หน้าตอบฟอร์ม (ถ้าตอบแล้ว → แสดงคำตอบเดิมให้แก้ไขได้)/forms/[id]/doneหน้ายืนยันส่งแล้ว9. แผนการพัฒนา (Development Phases)Phase 1 — MVP
PSU Passport Login + Role Resolution
6 Role พร้อม Faculty Scope
Form Builder แบบ Form-first (Drag & Drop)
Template System (Clone เข้า form_questions)
Copy ฟอร์มเก่า
Import / Export JSON (โครงสร้างฟอร์ม)
ตอบฟอร์มตาม Role + Status
ดูผล Dashboard แยก Faculty
Phase 2 — ปรับปรุง
Export PDF & Excel (ผลลัพธ์)
กราฟ Analytics
Dashboard ผู้บริหาร (Executive)
แจ้งเตือนฟอร์มใหม่
Phase 3 — ขยาย
เพิ่มประเภทคำถาม (ปรนัย / Dropdown)
eila_admin Panel เต็มรูปแบบ
ประวัติ / Audit Log
Multi-role Support (Migrate user_roles table)
10. การแบ่งงาน (Team)คนที่ 1 — Backend + Auth
ติดตั้ง Fastify + PostgreSQL
เชื่อม PSU Passport OAuth + Role Resolution Flow
API: users / roles / permissions / faculty scope
API: forms / templates / template_questions / form_questions
API: responses / answers (Upsert)
API: Import JSON (Validate + Clone)
API: Export JSON (Form Structure)
Export PDF (PDF-lib) + Excel (ExcelJS)
ระบบสิทธิ์ทั้ง 6 Role พร้อม Faculty Scope
คนที่ 2 — Frontend
ติดตั้ง Next.js + Tailwind
หน้า Login / PSU Passport Callback
Form Builder Drag & Drop (dnd-kit)
Import JSON: Upload → Validate Preview → Confirm Dialog
Export JSON: ปุ่ม Export โครงสร้างฟอร์ม
Template Picker & Clone
Copy Form feature
หน้าตอบฟอร์ม (Respondent) + Status
Admin Dashboard + กราฟ (แยก Faculty)
Executive Dashboard
eila — Web Evaluation System | SRS v1.1 | 2026-04-23
Prince of Songkla University