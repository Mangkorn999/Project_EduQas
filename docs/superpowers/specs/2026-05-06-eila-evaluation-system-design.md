# EILA Evaluation System — Full Redesign Spec
_2026-05-06_

## Overview

ระบบประเมินคุณภาพเว็บไซต์ PSU ออกแบบใหม่เน้น "ใช้งานง่ายเหมือน Google Forms" — admin สร้างการประเมินได้ใน wizard เดียว, evaluator ตอบแบบประเมินจาก API จริง, dashboard แสดงข้อมูล real-time แยกตาม role

---

## Roles

| Role (DB) | ชื่อในระบบ | ทำได้ |
|-----------|-----------|-------|
| `super_admin` | ผู้ดูแลระบบ IT | จัดการ users, audit log, system settings — ไม่ได้สร้างการประเมินเอง |
| `admin` | ผู้ดูแล EILA | สร้าง/จัดการการประเมินทั้งมหาวิทยาลัย, export รายงาน |
| `executive` | ผู้บริหาร | อ่านอย่างเดียว — dashboard + รายงาน |
| `teacher` / `staff` / `student` | ผู้ประเมิน | ตอบแบบประเมินที่ตรง faculty+role ของตัวเอง |

**admin faculty** — defer อนาคต ไม่ทำใน MVP  
DB `role` enum ไม่ต้องแก้ — `admin` = EILA admin ก่อน

| ทำอะไร | super_admin | admin (EILA) | executive | evaluator |
|--------|:-----------:|:------------:|:---------:|:---------:|
| จัดการ users / เปลี่ยน role | ✅ | ❌ | ❌ | ❌ |
| ดู audit log | ✅ | ❌ | ❌ | ❌ |
| สร้างการประเมิน | ❌ | ✅ | ❌ | ❌ |
| ดู dashboard ทุกคณะ | ✅ | ✅ | ✅ | ❌ |
| Export รายงาน | ✅ | ✅ | ✅ | ❌ |
| ตอบแบบประเมิน | ❌ | ❌ | ❌ | ✅ |

---

## Information Architecture

### Sidebar per role

```
EILA Admin / Faculty Admin:
  แดชบอร์ด
  การประเมิน          ← รวม "แบบฟอร์ม" + "รอบการประเมิน" เดิม
  ทะเบียนเว็บไซต์
  ผู้ใช้งาน            ← EILA admin only
  รายงาน
  บันทึกระบบ           ← EILA admin only

Executive:
  แดชบอร์ด
  รายงาน

Evaluator (student/staff/teacher):
  งานของฉัน           ← replaced dashboard
  ประวัติการประเมิน
```

ลบ concept "แบบฟอร์ม" และ "รอบการประเมิน" ออกจาก sidebar — รวมเป็น "การประเมิน" เดียว DB ยังแยก `rounds` + `forms` ไว้เหมือนเดิม แต่ UI ซ่อนไว้

---

## Feature 1: Evaluation Wizard (Google Forms style)

Entry point: หน้า "การประเมิน" → ปุ่ม "+ สร้างการประเมิน"

### Step 1 — ข้อมูลทั่วไป
- ชื่อการประเมิน (required)
- ปีการศึกษา + ภาคเรียน
- วันเริ่ม / วันสิ้นสุด

### Step 2 — เว็บไซต์ที่ประเมิน
- แสดง list เว็บจาก `websites` table
- EILA admin: filter by คณะ (multi-select) → เห็นทุกเว็บ
- Faculty admin: เห็นเฉพาะเว็บ `ownerFacultyId = user.facultyId`
- "+ เพิ่มเว็บใหม่" inline (ชื่อ + URL + คณะ → insert เข้า `websites` table)
- เลือกได้หลายเว็บ (checkbox)

### Step 3 — คำถาม
- Inline editor เหมือน Google Forms
- "+ เพิ่มคำถาม" 1 click → เพิ่ม card ใหม่ทันที
- Question types: `short_text`, `long_text`, `rating` (1–5), `single_choice`, `multi_choice`
- Drag-to-reorder (dnd-kit มีอยู่แล้ว)
- แต่ละ card: แก้ label, เลือก type, toggle required, ลบ
- Autosave debounce 1 วิ

### Step 4 — ส่งให้ใคร
- **คณะ**: EILA admin เห็น checkbox list ทุกคณะ + "ทุกคณะ" toggle
- **คณะ**: Faculty admin เห็นคณะตัวเองอัตโนมัติ (ไม่มี dropdown)
- **Role**: checkbox — นักศึกษา / อาจารย์ / บุคลากร
- Preview count: "จะส่งให้ ~X คน" (query real-time จาก `GET /assignments/preview-count`)

### Step 5 — ยืนยัน & Publish
- Summary: ชื่อ / เว็บ X เว็บ / X คน / วันที่
- [บันทึกร่าง] → status `draft`
- [เผยแพร่] → status `open`, snapshot ถูกสร้างใน `form_versions`

### Duplicate (reuse ปีถัดไป)
หน้า "การประเมิน" → action menu ของแต่ละ card → [Duplicate]
- Copy ชื่อ + คำถามทั้งหมดเป็น draft ใหม่
- ปีการศึกษา / วันที่ reset → admin กรอกใหม่
- เหมือน Google Forms "Make a copy"

---

## Feature 2: Evaluator Flow (ต่อ API จริง)

**หลักการ**: ไม่ใช้ `evaluatorAssignments` table สำหรับ auto-distribute — ใช้ dynamic check แทน

```
evaluator เห็นฟอร์มได้ถ้า:
  form.status = 'open'
  AND form.ownerFacultyId = user.facultyId  (faculty scope)
  AND user.role ∈ form_target_roles
```

ไม่ต้อง bulk insert assignments → scale ได้, คนเข้าระบบทีหลัง publish ก็ได้รับอัตโนมัติ

### Pages

**งานของฉัน** (`/dashboard` สำหรับ evaluator)
- ดึง `GET /api/v1/forms?assignedToMe=true`
- แสดง list การประเมินที่ active + status ของ response ตัวเอง
- Badge: "ค้าง X ชิ้น"
- Status per item: ยังไม่เริ่ม / กำลังทำ / ส่งแล้ว

**Gate page** (`/evaluator/evaluate/[formId]/gate`)
- แสดงข้อมูลเว็บไซต์จาก API จริง (ไม่ใช่ mock)
- ปุ่ม "เปิดเว็บและเริ่มประเมิน" → `POST /responses/forms/:formId/website-open` แล้ว redirect

**Form page** (`/evaluator/evaluate/[formId]/form`)
- Load คำถามจาก `GET /api/v1/forms/:id`
- Autosave: `PATCH /responses/:responseId` ทุก 30 วิ
- Submit: `POST /responses/forms/:formId/responses`
- ถ้า response มีอยู่แล้ว (submitted) → redirect ไป success

**Success page**
- แสดง confirmation + วันที่ส่ง
- ปุ่ม "กลับงานของฉัน"

---

## Feature 3: Dashboard

### Admin / EILA Admin

```
Hero section:
  ชื่อการประเมินที่ active ล่าสุด + วันสิ้นสุด
  Progress: [████████░░] 67%  342/512 คน

Stat cards (4):
  ทั้งหมด | ส่งแล้ว | กำลังทำ | ยังไม่เริ่ม

Bar chart: completion rate แยก role
  นักศึกษา  ████████░░ 78%
  อาจารย์   ██████░░░░ 61%
  บุคลากร   █████░░░░░ 54%

Table: ผลคะแนนเว็บไซต์
  เว็บ | คะแนนเฉลี่ย | จำนวนคนตอบ | status
```

API: `GET /api/v1/dashboard/overview?roundId=` (มีอยู่แล้ว)
เพิ่ม: completion breakdown by role

### Executive

เหมือน Admin + cross-faculty comparison:
- Bar chart: completion rate แยกคณะ
- Top 5 / Bottom 5 websites by score

### Evaluator

```
Hero:
  สวัสดี [ชื่อ]
  ค้าง 2 การประเมิน  deadline ใกล้สุด: 15 ม.ค.

List cards:
  [เว็บ A] ยังไม่เริ่ม → [เริ่มประเมิน]
  [เว็บ B] 60% → [ทำต่อ]
  [เว็บ C] ส่งแล้ว ✓
```

---

## Feature 4: ทะเบียนเว็บไซต์

หน้าจัดการเว็บที่ต้องประเมิน:
- List + search + filter by คณะ
- Add เว็บ: ชื่อ + URL + คณะ (faculty admin = auto-set)
- Edit / Soft delete
- แสดง `urlStatus` (ok / unreachable) จาก cron check

---

## Technical Decisions

### Assignment Model
ใช้ **dynamic check** (วิธี B) แทน bulk insert:
- `forms?assignedToMe=true` → query forms ที่ `status=open` + faculty + role match
- `evaluatorAssignments` table ยังคงไว้สำหรับกรณี admin อยากระบุตัวบุคคลเจาะจง (optional, ไม่ใช่ main flow)

### API เพิ่มที่ต้องสร้าง
| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/forms?assignedToMe=true` | Evaluator ดึงงานของตัวเอง |
| `GET` | `/api/v1/assignments/preview-count` | Wizard Step 4 count preview (มีอยู่แล้ว) |

### API แก้ที่มีอยู่
| Path | แก้อะไร |
|------|---------|
| `GET /api/v1/forms` | เพิ่ม `assignedToMe` query param สำหรับ evaluator role |
| `GET /api/v1/dashboard/overview` | เพิ่ม completion breakdown by role |

### Bug Fixes
| ปัญหา | แก้ |
|-------|-----|
| Audit page 500 error | Debug `audit.controller.ts` — likely missing DB relation |
| Evaluator pages ใช้ mock data | แทน `WEBSITES` constant ด้วย API call |
| Permission UI ผิด role | Fix sidebar items + route guard ตาม role table ด้านบน |
| `page-new.tsx` zombie file | ลบ |

---

## MVP Scope (Phase 1 — ทำก่อน)

✅ **In scope:**
- Evaluation Wizard (Step 1–5) + Duplicate
- Evaluator Flow (ต่อ API จริงทั้งหมด)
- Dashboard basic (completion stats + website scores)
- Website registry (list + add + edit)
- Permission/role bug fixes
- Audit 500 fix

⏳ **Defer (Phase 2):**
- Outlook/email notification
- Executive cross-faculty comparison chart
- PDF report export
- Trend / historical comparison

---

## Data Flow Summary

```
Admin สร้างการประเมิน (Wizard)
  → สร้าง round + form + formQuestions + formTargetRoles
  → Publish → form.status = 'open' + snapshot ใน form_versions

Evaluator login
  → GET /forms?assignedToMe=true
  → เห็น form ที่ faculty+role match
  → เปิด gate → POST website-open
  → ตอบคำถาม → autosave (PATCH response)
  → Submit → POST response + responseAnswers

Admin ดู dashboard
  → GET /dashboard/overview?roundId=
  → เห็น completion stats + average scores
```
