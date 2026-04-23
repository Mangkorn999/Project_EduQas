# eila — Software Requirements Specification (SRS)

> ระบบประเมินเว็บไซต์มหาวิทยาลัย / Web Evaluation System  
> Prince of Songkla University  
> Version 1.0 | Updated: 2026-04-23

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์
eila คือระบบเว็บสำหรับประเมินเว็บไซต์ของมหาวิทยาลัย โดย Admin สามารถสร้างแบบประเมินแบบ Drag & Drop คล้าย Google Form กำหนด Role ที่รับฟอร์ม และดูผลลัพธ์ผ่าน Dashboard ผู้ใช้ทุกคน Login ผ่าน PSU Passport และระบบแยก Role อัตโนมัติ

### 1.2 ขอบเขตของระบบ (Scope)
- สร้างและจัดการแบบประเมิน (Form) และ Template
- ระบบ Authentication ผ่าน PSU Passport (OAuth)
- กำหนดสิทธิ์การเข้าถึงตาม Role
- แสดงผลลัพธ์ผ่าน Dashboard
- Export ผลลัพธ์เป็น PDF และ Excel

### 1.3 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Fastify + Node.js |
| Database | PostgreSQL |
| Authentication | PSU Passport (OAuth) |
| Form Drag & Drop | dnd-kit |
| Export | PDF-lib + ExcelJS |
| Deploy | TBD |

---

## 2. ผู้ใช้งาน (User Roles)

ระบบมีทั้งหมด **6 Role**

| Role | สร้างฟอร์ม | ตอบฟอร์ม | ดู Dashboard | จัดการ Admin |
|---|:---:|:---:|:---:|:---:|
| Super Admin | ✅ | ❌ | ✅ | ✅ |
| Admin | ✅ | ❌ | ✅ | ❌ |
| ผู้บริหาร (Executive) | ❌ | ❌ | ✅ | ❌ |
| อาจารย์ (Teacher) | ❌ | ✅ | ❌ | ❌ |
| บุคลากร (Staff) | ❌ | ✅ | ❌ | ❌ |
| นักศึกษา (Student) | ❌ | ✅ | ❌ | ❌ |

### 2.1 Super Admin
- จัดการ Admin ได้ (เพิ่ม / ลบ / แก้ไข)
- จัดการผู้ใช้ทุก Role
- ดูภาพรวมระบบทั้งหมด
- มีได้ 1–2 คนเท่านั้น

### 2.2 Admin
- สร้าง / แก้ไข / ลบฟอร์ม
- Copy ฟอร์มเก่าไปสร้างใหม่และแก้ไขได้
- สร้าง / แก้ไข / ลบ Template
- กำหนด Role ที่รับฟอร์ม
- เปิด / ปิดฟอร์ม
- ดูผลลัพธ์และ Export
- มีได้หลายคน ดูข้อมูลได้ทั้งระบบ (ไม่แยกตามคณะ)

### 2.3 ผู้บริหาร (Executive)
- ดู Dashboard ได้ทุกฟอร์มทุกคณะ
- Export PDF และ Excel ได้
- **ไม่ตอบฟอร์ม** (เพื่อความถูกต้องของข้อมูล)

### 2.4 อาจารย์ / บุคลากร / นักศึกษา (Respondent)
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
กำหนดโดย Super Admin  →  executive / admin / super_admin
---

## 4. Functional Requirements

### 4.1 Form Builder

- **FR-F01** ผู้ใช้ที่มีสิทธิ์สามารถสร้างฟอร์มใหม่ได้
- **FR-F02** รองรับการ Drag & Drop เพื่อเรียงลำดับคำถาม
- **FR-F03** สามารถเพิ่ม / ลบ / แก้ไขคำถามใน Form ได้
- **FR-F04** สามารถกำหนด URL เว็บไซต์ที่ต้องการประเมินได้
- **FR-F05** สามารถกำหนด Role ที่จะรับฟอร์มได้ (เลือกได้หลาย Role)
- **FR-F06** สามารถเปิด / ปิดฟอร์มได้ตลอดเวลา
- **FR-F07** ฟอร์มมีสถานะ 3 สถานะ ได้แก่ `draft` / `open` / `closed`
- **FR-F08** สามารถ Copy ฟอร์มเก่าไปสร้างใหม่และแก้ไขได้

### 4.2 Template System

- **FR-T01** Admin สามารถสร้าง Template ชุดคำถามสำเร็จรูปได้
- **FR-T02** Admin สามารถเลือก Template มาใช้ซ้ำเมื่อสร้างฟอร์มได้
- **FR-T03** Admin สามารถแก้ไข Template ก่อนเผยแพร่ได้
- **FR-T04** Admin สามารถลบ Template ได้

### 4.3 ประเภทคำถาม (Question Types)

- **FR-Q01** Rating Scale (1–5 ดาว)
- **FR-Q02** Short Text (ข้อความสั้น / ความคิดเห็น)
- **FR-Q03** สามารถกำหนดได้ว่าคำถามข้อนั้นบังคับตอบหรือไม่
- **FR-Q04** สามารถเรียงลำดับคำถามได้อิสระด้วย Drag & Drop

### 4.4 การตอบฟอร์ม (Response)

- **FR-R01** Respondent เห็นเฉพาะฟอร์มที่ถูกกำหนดให้ Role ตัวเอง
- **FR-R02** แสดงสถานะฟอร์ม: ยังไม่ตอบ / ตอบแล้ว
- **FR-R03** Respondent สามารถแก้ไขคำตอบได้จนกว่า Admin จะปิดฟอร์ม
- **FR-R04** Respondent ไม่สามารถเห็นคำตอบของคนอื่นได้

### 4.5 Dashboard & Analytics

- **FR-D01** Admin ดูผลลัพธ์ของฟอร์มทุกฟอร์มได้
- **FR-D02** ผู้บริหารดู Dashboard ได้ทุกฟอร์มทุกคณะ
- **FR-D03** แสดงคะแนนเฉลี่ยของแต่ละคำถาม
- **FR-D04** แสดงกราฟสรุปผลภาพรวม
- **FR-D05** แสดงจำนวนผู้ตอบทั้งหมด
- **FR-D06** แสดงความคิดเห็น (Short Text) ทั้งหมด

### 4.6 Export

- **FR-E01** Export ผลลัพธ์เป็น PDF ได้
- **FR-E02** Export ผลลัพธ์เป็น Excel ได้
- **FR-E03** Admin และผู้บริหารสามารถ Export ได้

### 4.7 User Management (Super Admin)

- **FR-U01** Super Admin สามารถเพิ่ม / ลบ / แก้ไข Admin ได้
- **FR-U02** Super Admin สามารถกำหนด Role ให้ผู้ใช้ได้ (executive / admin / super_admin)
- **FR-U03** Super Admin ดูภาพรวมผู้ใช้งานทั้งระบบได้

---

## 5. Non-Functional Requirements

- **NFR-01** ระบบต้องรองรับ Multi-role ได้ในคนเดียวกัน (ถ้าจำเป็นในอนาคต)
- **NFR-02** ระบบต้องรองรับการใช้งานบน Mobile (Responsive)
- **NFR-03** ระบบต้องมีการตรวจสอบสิทธิ์ทุก API Request (Authorization)
- **NFR-04** ข้อมูลคำตอบต้องถูกต้องและ Tamper-proof
- **NFR-05** ระบบต้องรองรับ Admin หลายคนพร้อมกัน

---

## 6. Database Schema

### users
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| psu_passport_id | String | ID จาก PSU Passport |
| name | String | ชื่อ-นามสกุล |
| email | String | อีเมลมหาวิทยาลัย |
| role | Enum | super_admin / admin / executive / teacher / staff / student |
| faculty | String | คณะ / หน่วยงาน |
| created_at | DateTime | วันที่สร้าง |

### templates
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| name | String | ชื่อ Template |
| description | String | คำอธิบาย |
| created_by | UUID | FK → users |
| created_at | DateTime | วันที่สร้าง |

### questions
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| template_id | UUID | FK → templates |
| question_text | String | ข้อคำถาม |
| question_type | Enum | rating / short_text |
| order | Integer | ลำดับ (สำหรับ Drag & Drop) |
| required | Boolean | บังคับตอบ |

### forms
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| title | String | ชื่อฟอร์ม |
| website_url | String | URL เว็บที่ประเมิน |
| template_id | UUID | FK → templates |
| target_roles | Array | Roles ที่รับฟอร์ม |
| status | Enum | draft / open / closed |
| copied_from | UUID | FK → forms (ถ้า Copy มา) |
| created_by | UUID | FK → users |
| created_at | DateTime | วันที่สร้าง |

### responses
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| form_id | UUID | FK → forms |
| user_id | UUID | FK → users |
| submitted_at | DateTime | วันที่ส่ง |
| updated_at | DateTime | วันที่แก้ไขล่าสุด |

### answers
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID | Primary Key |
| response_id | UUID | FK → responses |
| question_id | UUID | FK → questions |
| rating_value | Integer | ถ้าเป็น Rating (1–5) |
| text_value | String | ถ้าเป็น Short Text |

---

## 7. หน้าเว็บ (Pages)

### ทั่วไป
| Path | คำอธิบาย |
|---|---|
| `/` | Landing Page + ปุ่ม Login |
| `/auth/callback` | PSU Passport OAuth Callback |

### Super Admin
| Path | คำอธิบาย |
|---|---|
| `/super-admin/dashboard` | ภาพรวมระบบทั้งหมด |
| `/super-admin/users` | จัดการผู้ใช้ทุก Role |
| `/super-admin/admins` | จัดการ Admin |

### Admin
| Path | คำอธิบาย |
|---|---|
| `/admin/dashboard` | สรุปภาพรวมฟอร์มทั้งหมด |
| `/admin/forms` | รายการฟอร์มทั้งหมด |
| `/admin/forms/create` | สร้างฟอร์มใหม่ |
| `/admin/forms/[id]/edit` | แก้ไขฟอร์ม |
| `/admin/forms/[id]/copy` | Copy ฟอร์มไปสร้างใหม่ |
| `/admin/forms/[id]/results` | ดูผลลัพธ์ + Export |
| `/admin/templates` | รายการ Template ทั้งหมด |
| `/admin/templates/create` | สร้าง Template ใหม่ |
| `/admin/templates/[id]/edit` | แก้ไข Template |

### ผู้บริหาร
| Path | คำอธิบาย |
|---|---|
| `/executive/dashboard` | Dashboard ทุกฟอร์มทุกคณะ |
| `/executive/forms/[id]/results` | ดูผลลัพธ์ + Export |

### Respondent
| Path | คำอธิบาย |
|---|---|
| `/home` | รายการฟอร์มที่ได้รับตาม Role |
| `/forms/[id]` | หน้าตอบฟอร์ม |
| `/forms/[id]/done` | หน้ายืนยันส่งแล้ว |

---

## 8. แผนการพัฒนา (Development Phases)

### Phase 1 — MVP
- PSU Passport Login
- 6 Role อัตโนมัติ
- สร้างฟอร์ม Drag & Drop
- Template System
- Copy ฟอร์มเก่า
- ตอบฟอร์มตาม Role
- ดูผล Dashboard

### Phase 2 — ปรับปรุง
- Export PDF & Excel
- กราฟ Analytics
- Dashboard ผู้บริหาร
- แจ้งเตือนฟอร์มใหม่

### Phase 3 — ขยาย
- เพิ่มประเภทคำถาม (ปรนัย / Dropdown)
- Super Admin Panel เต็มรูปแบบ
- ประวัติ / Audit Log

---

## 9. การแบ่งงาน (Team)

### คนที่ 1 — Backend + Auth
- ติดตั้ง Fastify + PostgreSQL
- เชื่อม PSU Passport OAuth
- API: users / roles / permissions
- API: forms / templates / questions
- API: responses / answers
- ระบบสิทธิ์ทั้ง 6 Role
- Export PDF (PDF-lib)
- Export Excel (ExcelJS)

### คนที่ 2 — Frontend
- ติดตั้ง Next.js + Tailwind
- หน้า Login / PSU Passport Callback
- Form Builder Drag & Drop (dnd-kit)
- Template Picker & Editor
- Copy Form feature
- หน้าตอบฟอร์ม (Respondent)
- Admin Dashboard + กราฟ
- Executive Dashboard

---

*eila — Web Evaluation System | SRS v1.0 | 2026-04-23*
