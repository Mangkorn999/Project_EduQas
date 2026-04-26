# eila SRS v2.1
# ระบบประเมินคุณภาพเว็บไซต์หน่วยงาน มหาวิทยาลัยสงขลานครินทร์
วันที่: 2026-04-27

---

## Change Log from SRS2.0

| # | Section | SRS2.0 says | SRS2.1 says | Rationale |
|---|---------|-------------|-------------|-----------|
| 1 | §5.1, Appendix A, NFR-MAINT-04, NFR-SEC-04 | Prisma ORM | **Drizzle ORM** | Prior product decision; SQL transparency; drizzle-kit migration model |
| 2 | §2.3, FR-AUTH, FR-USER main text | `eila_admin` / `faculty_admin` | **`super_admin` / `admin`** | Align with Appendix C role matrix |

**Role mapping for backward reference:**

- `super_admin` ↔ `eila_admin`
- `admin` ↔ `faculty_admin`
- Other roles unchanged

---

## 1. บทนำ (Introduction)

### 1.1 วัตถุประสงค์
eila คือระบบ Website Evaluation System ของสำนักการศึกษาและนวัตกรรมการเรียนรู้ มหาวิทยาลัยสงขลานครินทร์ สำหรับใช้สร้างแบบประเมินคุณภาพเว็บไซต์ของคณะและหน่วยงานภายใน PSU จัดสรรผู้ประเมิน รวบรวมคะแนน วิเคราะห์ผล จัดอันดับเว็บไซต์ และส่งออกรายงานเพื่อใช้ปรับปรุงเว็บไซต์ในรอบถัดไป

วัตถุประสงค์หลักของระบบมีดังนี้
1. ประเมินคุณภาพเว็บไซต์ของคณะและหน่วยงานภายใน PSU
2. ให้ admin สร้างแบบประเมินและผูกเว็บไซต์เป้าหมายที่ต้องการประเมิน
3. ให้ผู้ประเมินรับ assignment เปิดเว็บไซต์จริง แล้วให้คะแนนตามเกณฑ์
4. รวบรวมคะแนนเพื่อคำนวณ score, ranking และ analytics รายเว็บไซต์ รายคณะ และระดับมหาวิทยาลัย
5. ส่งออกรายงานผลการประเมินเพื่อนำไปใช้พัฒนาเว็บไซต์

### 1.2 ขอบเขตของระบบ
ระบบครอบคลุมความสามารถหลักดังนี้
- Authentication ผ่าน PSU Passport โดยใช้ OAuth 2.0 + PKCE + JWT
- Website Registry สำหรับจัดการรายการเว็บไซต์เป้าหมาย
- Evaluation Round สำหรับจัดกลุ่มการประเมินตามปีการศึกษา ภาคการศึกษา หรือรอบประเมิน
- Form Builder สำหรับสร้างแบบประเมินเว็บไซต์แบบ drag and drop
- Evaluation Criteria และ Template สำหรับเกณฑ์ประเมินมาตรฐาน PSU
- Assignment และหน้าประเมินสำหรับ teacher, staff, student
- Dashboard, Ranking, Score Card และรายงานคุณภาพเว็บไซต์
- Notification แบบ Email และ In-app
- Import และ Export ข้อมูลและรายงาน
- Audit Log, Data Lifecycle, PDPA Compliance, Backup และ Disaster Recovery

ระบบนี้ไม่ครอบคลุม
- การแก้ไขเนื้อหาเว็บไซต์ของหน่วยงานโดยตรง
- การ crawl เว็บไซต์ภายนอก PSU แบบอัตโนมัติในวงกว้าง
- การให้ public anonymous user เข้าตอบแบบประเมิน

### 1.3 คำนิยามและคำย่อ

| คำศัพท์ | ความหมาย |
|---|---|
| EILA | สำนักการศึกษาและนวัตกรรมการเรียนรู้ |
| PSU | มหาวิทยาลัยสงขลานครินทร์ |
| WebsiteTarget | ระเบียนเว็บไซต์ที่อยู่ใน pool สำหรับนำไปประเมิน |
| Evaluation Form | แบบประเมินคุณภาพเว็บไซต์ที่ผูกกับเว็บไซต์เป้าหมาย |
| Evaluation Round | รอบการประเมินที่ใช้จัดกลุ่ม form หลายชุด |
| Criteria | มิติหรือเกณฑ์การประเมิน เช่น Design, Usability |
| Score Card | หน้าสรุปคะแนนเว็บไซต์รายเว็บ |
| Ranking | การจัดอันดับเว็บไซต์ตามคะแนนรวม |
| Respondent / Evaluator | ผู้ประเมินที่ได้รับมอบหมายให้ตอบแบบประเมิน |
| Faculty | คณะ วิทยาเขต หรือหน่วยงานเจ้าของเว็บไซต์ |
| Soft Delete | การซ่อนข้อมูลโดยกำหนด `deleted_at` แทนการลบจริง |
| PDPA | พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| WCAG | Web Content Accessibility Guidelines |

### 1.4 ภาพรวมเอกสาร
เอกสารนี้จัดทำตามแนวทาง IEEE 830 และแบ่งออกเป็น 6 ส่วนหลัก ได้แก่ บทนำ ภาพรวมระบบ Functional Requirements Non-Functional Requirements Constraints and Assumptions และ Appendix สำหรับ schema, endpoint, role matrix, use case และ roadmap

---

## 2. ภาพรวมระบบ (Overall Description)

### 2.1 Product Perspective
eila เป็นระบบเว็บภายในมหาวิทยาลัยที่เชื่อมต่อกับ PSU Passport สำหรับยืนยันตัวตนและใช้ PostgreSQL เป็นฐานข้อมูลหลัก ระบบทำหน้าที่เป็นศูนย์กลางสำหรับบริหารเว็บไซต์ที่ต้องประเมิน สร้างเกณฑ์ประเมิน กำหนดผู้ประเมิน เก็บคะแนน วิเคราะห์ผล และเผยแพร่รายงานผลประเมินให้ผู้เกี่ยวข้อง

### 2.2 Product Functions
ฟังก์ชันหลักของระบบประกอบด้วย
- ยืนยันตัวตนและกำหนดสิทธิ์ตาม role และ faculty
- จัดการ Website Registry และการ validate URL
- จัดการ Evaluation Round และผูกฟอร์มเข้ากับรอบประเมิน
- สร้างและจัดการ Evaluation Form พร้อม criteria, weights และ templates
- มอบหมายแบบประเมินให้ผู้ประเมินตาม scope และ role
- ให้ผู้ประเมินเปิดเว็บไซต์จริงก่อนส่งคำตอบ
- คำนวณคะแนนรวม คะแนนรายมิติ response rate ranking percentile และ trend
- สร้าง dashboard และ score card ระดับเว็บไซต์ ระดับคณะ และระดับมหาวิทยาลัย
- ส่งแจ้งเตือน assignment และ reminder
- นำเข้าและส่งออก JSON, PDF, Excel, XLSX
- จัดเก็บ audit log และบริหาร data lifecycle ตาม PDPA

### 2.3 User Classes & Characteristics

| Role | ลักษณะผู้ใช้ | ความสามารถหลัก |
|---|---|---|
| `super_admin` | ผู้ดูแลระบบส่วนกลาง | จัดการทุกอย่างทั้งมหาวิทยาลัย |
| `admin` | ผู้ดูแลระดับคณะหรือหน่วยงาน | จัดการเว็บไซต์ ฟอร์ม และรายงานของ faculty ตัวเอง |
| `executive` | ผู้บริหาร | ดู dashboard และ ranking ระดับมหาวิทยาลัยแบบ read-only |
| `teacher` | ผู้ประเมิน | เปิดเว็บไซต์และตอบแบบประเมินที่ได้รับ |
| `staff` | ผู้ประเมิน | เปิดเว็บไซต์และตอบแบบประเมินที่ได้รับ |
| `student` | ผู้ประเมิน | เปิดเว็บไซต์และตอบแบบประเมินที่ได้รับ |

### 2.4 Assumptions & Dependencies
- PSU Passport ส่งข้อมูลตัวตนขั้นต่ำได้แก่ `psu_passport_id`, role, faculty_id หรือข้อมูลที่เทียบเท่า
- PSU SMTP พร้อมใช้งานสำหรับ email notification
- หน่วยงานเจ้าของเว็บไซต์สามารถเข้าถึง PDF report ที่ export ได้
- บางเว็บไซต์อาจไม่รองรับ iframe preview และระบบต้อง fallback เป็น open new tab
- การคำนวณ ranking และ trend อาศัยข้อมูลรอบประเมินที่ปิดแล้วหรือข้อมูลที่ผ่านเกณฑ์ขั้นต่ำของ response rate

---

## 3. Functional Requirements (FR)

### FR-AUTH : Authentication & Authorization (FR-AUTH-01 ถึง FR-AUTH-20)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-AUTH-01 | ระบบ SHALL ใช้ PSU Passport ผ่าน OAuth 2.0 + PKCE เป็นช่องทาง login หลัก | Must Have | Backend | login ผ่าน PSU สำเร็จและไม่พบ password flow ภายในระบบ |
| FR-AUTH-02 | ระบบ SHALL validate `state` และ token response ทุกครั้งที่ callback | Must Have | Backend | callback ที่ `state` ไม่ตรงต้องถูก reject |
| FR-AUTH-03 | ระบบ SHALL map ผู้ใช้เป็น 6 roles ตาม policy กลางของระบบ | Must Have | Backend | user ถูก assign role ถูกต้องจาก PSU หรือ override |
| FR-AUTH-04 | ระบบ SHALL ใช้ `FALLBACK_FACULTY_ID` เมื่อ PSU ไม่ส่ง `faculty_id` | Must Have | Backend | user ที่ไม่มี faculty_id ถูก assign fallback และเห็นเฉพาะ university scope |
| FR-AUTH-05 | ระบบ SHALL default role เป็น `student` เมื่อ PSU ไม่ส่ง role | Must Have | Backend | login ที่ไม่มี role แล้วใน DB ต้องเป็น student |
| FR-AUTH-06 | ระบบ SHALL ออก `access_token` อายุ 15 นาที | Must Have | Backend | token หมดอายุตาม exp ไม่เกิน 15 นาที |
| FR-AUTH-07 | ระบบ SHALL ออก `refresh_token` อายุ 7 วัน | Must Have | Backend | refresh token ใช้งานได้ไม่เกิน 7 วัน |
| FR-AUTH-08 | ระบบ SHALL เก็บ refresh token เป็น hash เท่านั้น | Must Have | Backend | DB ไม่พบ plaintext refresh token |
| FR-AUTH-09 | ระบบ SHALL ใช้ refresh token rotation แบบ atomic transaction | Must Have | Backend | refresh สำเร็จแล้ว token เดิมใช้ซ้ำไม่ได้ |
| FR-AUTH-10 | ระบบ SHALL ทำ reuse detection และ revoke ทุก token ของ user เมื่อพบ token reuse | Must Have | Backend | refresh token เดิมถูกใช้ซ้ำแล้ว session ทั้งหมดของ user ถูก revoke |
| FR-AUTH-11 | ระบบ SHALL มี endpoint `POST /auth/refresh` | Must Have | Backend | เรียก refresh ด้วย token valid แล้วได้ token pair ใหม่ |
| FR-AUTH-12 | ระบบ SHALL มี endpoint `POST /auth/logout` สำหรับ revoke current session | Must Have | Backend | logout แล้ว refresh token ของ session ปัจจุบันใช้ไม่ได้ |
| FR-AUTH-13 | ระบบ SHALL มี endpoint `POST /auth/revoke-all` สำหรับ revoke ทุก session ของ user | Must Have | Backend | revoke-all แล้ว refresh token ทุกตัวของ user ใช้ไม่ได้ |
| FR-AUTH-14 | ระบบ SHALL revoke token ทุกตัวเมื่อ user ถูก soft delete | Must Have | Backend | soft delete user แล้ว refresh ทุกตัวใช้ไม่ได้ |
| FR-AUTH-15 | ระบบ SHALL revoke token ทุกตัวของผู้ถูก override role ทันที | Must Have | Backend | override role แล้ว user ถูกบังคับ login ใหม่ |
| FR-AUTH-16 | ระบบ SHALL รองรับ idle timeout 30 นาที โดยนับ activity จาก authenticated API call เท่านั้น | Must Have | Both | ไม่มี API call 30 นาทีแล้ว session หมด |
| FR-AUTH-17 | ระบบ SHALL รองรับ absolute timeout 8 ชั่วโมงต่อ login session | Must Have | Both | active ต่อเนื่อง 8 ชั่วโมงแล้วถูกบังคับ login ใหม่ |
| FR-AUTH-18 | Frontend SHALL แสดง warning dialog ก่อน session หมด 5 นาที | Must Have | Frontend | warning dialog ปรากฏพร้อม countdown ก่อนหมดเวลา |
| FR-AUTH-19 | ระบบ SHALL redirect ไป `/login?redirect=[current_path]` หลัง session หมด | Must Have | Both | session หมดแล้วกลับมาหน้าเดิมได้หลัง login |
| FR-AUTH-20 | ระบบ SHALL รองรับ role override ด้วย Email OTP สำหรับ super_admin เท่านั้น | Must Have | Both | OTP ถูกต้องแล้ว role เปลี่ยนสำเร็จและมี audit log |

### FR-WEB : Website Target Management (FR-WEB-01 ถึง FR-WEB-10)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-WEB-01 | ระบบ SHALL มี entity `WebsiteTarget` สำหรับเก็บเว็บไซต์ที่อยู่ใน pool | Must Have | Backend | สามารถสร้าง record website target ได้ครบ field หลัก |
| FR-WEB-02 | super_admin SHALL จัดการ WebsiteTarget ได้ทั้งหมดแบบ CRUD | Must Have | Both | super_admin สร้าง แก้ไข ลบ soft delete และดูทุกเว็บได้ |
| FR-WEB-03 | admin SHALL จัดการได้เฉพาะ WebsiteTarget ที่ `ownerFacultyId` ตรงกับ faculty ตัวเอง | Must Have | Both | admin แก้ไขเว็บข้าม faculty ไม่ได้ |
| FR-WEB-04 | ระบบ SHALL รองรับการเพิ่ม WebsiteTarget โดยระบุ `name`, `url`, `ownerFacultyId`, `category` | Must Have | Both | form create/edit บังคับกรอกข้อมูลหลักครบ |
| FR-WEB-05 | ระบบ SHALL รองรับการเลือก WebsiteTarget จาก registry ตอนสร้างฟอร์ม | Must Have | Both | admin เลือก website target แล้วค่าถูกผูกเข้าฟอร์ม |
| FR-WEB-06 | ระบบ SHALL อนุญาตให้ admin พิมพ์ URL ใหม่เองได้ แม้ไม่อยู่ใน registry | Should Have | Both | admin สร้างฟอร์มด้วย manual URL ได้และบันทึกสำเร็จ |
| FR-WEB-07 | ระบบ SHALL รองรับ bulk import WebsiteTarget จาก XLSX สำหรับ super_admin | Should Have | Both | import XLSX ถูกต้องแล้วสร้างหลาย website target ได้ |
| FR-WEB-08 | ระบบ SHALL validate URL ของ WebsiteTarget อัตโนมัติทุก 24 ชั่วโมงผ่าน cron job | Must Have | Backend | cron run แล้วอัปเดต `urlStatus` และ `lastValidatedAt` ได้ |
| FR-WEB-09 | ระบบ SHALL แจ้งเตือน super_admin เมื่อพบ WebsiteTarget ที่ `urlStatus = unreachable` | Must Have | Backend | URL unreachable แล้วมี notification ถึง super_admin |
| FR-WEB-10 | ระบบ SHALL รองรับ soft delete WebsiteTarget และไม่แสดงรายการที่ถูกลบใน selection list โดย default | Must Have | Both | เว็บที่ soft delete แล้วไม่โผล่ใน registry list ปกติ |

### FR-ROUND : Evaluation Round Management (FR-ROUND-01 ถึง FR-ROUND-08)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-ROUND-01 | ระบบ SHALL มี entity `EvaluationRound` สำหรับจัดกลุ่มฟอร์มตามปีการศึกษาและรอบประเมิน | Must Have | Backend | สามารถสร้าง round ได้ครบ field หลัก |
| FR-ROUND-02 | super_admin SHALL สร้าง round ระดับมหาวิทยาลัยได้ | Must Have | Both | round ที่ `scope = university` ถูกสร้างโดย super_admin ได้ |
| FR-ROUND-03 | admin SHALL สร้าง round ระดับ faculty ของตัวเองได้ | Must Have | Both | admin สร้าง round faculty อื่นไม่ได้ |
| FR-ROUND-04 | ฟอร์มแต่ละชุด MAY ผูกกับ EvaluationRound ได้ 1 รอบแบบ optional | Must Have | Both | form create/edit สามารถเลือก round หรือไม่เลือกได้ |
| FR-ROUND-05 | Dashboard SHALL filter ตาม EvaluationRound ได้ | Must Have | Both | เลือก round แล้ว dashboard เปลี่ยนข้อมูลตาม round |
| FR-ROUND-06 | ระบบ SHALL เปรียบเทียบผลระหว่าง EvaluationRound ได้เมื่อ website target เดียวกันมีข้อมูลมากกว่า 1 รอบ | Should Have | Backend | round comparison แสดงคะแนนต่างกันได้ |
| FR-ROUND-07 | เมื่อ round เปลี่ยนสถานะเป็น `closed` ระบบ SHALL auto-close ทุก form ที่สังกัดรอบนั้น | Must Have | Backend | close round แล้ว form ใต้ round ถูกปิดทั้งหมด |
| FR-ROUND-08 | ระบบ SHALL รองรับสถานะ `draft`, `active`, `closed` และบันทึก audit log ทุกครั้งที่สถานะเปลี่ยน | Must Have | Backend | เปลี่ยนสถานะแล้วมี audit log และ validation ถูกต้อง |

### FR-FORM : Form Builder & Management (FR-FORM-01 ถึง FR-FORM-25)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-FORM-01 | admin SHALL สร้าง Website Evaluation Form แบบเปล่าได้ | Must Have | Both | สร้าง form ใหม่ได้โดยไม่ใช้ template |
| FR-FORM-02 | ฟอร์ม SHALL มี field บังคับ `website_url` เสมอ | Must Have | Both | บันทึกฟอร์มโดยไม่มี website_url ไม่ได้ |
| FR-FORM-03 | ฟอร์ม SHALL มี `website_name` สำหรับแสดงชื่อเว็บไซต์หรือหน่วยงานเจ้าของเว็บ | Must Have | Both | form detail แสดง website_name ได้ |
| FR-FORM-04 | ฟอร์ม SHALL มี `website_owner_faculty` เพื่อระบุ faculty หรือหน่วยงานเจ้าของเว็บ | Must Have | Both | form detail เก็บและแสดง owner faculty ได้ |
| FR-FORM-05 | ฟอร์ม SHALL รองรับ drag and drop builder ด้วย 10 field types ที่ระบบกำหนด | Must Have | Both | admin เพิ่มและ reorder field ได้อย่างน้อย 10 ประเภท |
| FR-FORM-06 | admin SHALL เพิ่ม ลบ แก้ไข และ reorder questions ได้ | Must Have | Both | question list เปลี่ยนลำดับและบันทึกได้ |
| FR-FORM-07 | ฟอร์ม SHALL รองรับการกำหนด criteria weight ต่อมิติ | Must Have | Both | บันทึก weight แล้วถูกใช้ในการคำนวณคะแนนรวม |
| FR-FORM-08 | URL validation SHALL ตรวจสอบ format และ timeout ไม่เกิน 5 วินาทีต่อ HEAD request | Must Have | Backend | URL invalid หรือ timeout ถูกแจ้งเตือนก่อน publish |
| FR-FORM-09 | ระบบ SHALL เตือน admin ก่อน publish หาก website_url unreachable | Must Have | Frontend | publish form ด้วย URL unreachable แล้วเห็น warning |
| FR-FORM-10 | admin SHALL สร้างได้เฉพาะ `faculty` scope | Must Have | Both | admin เลือก university scope ไม่ได้ |
| FR-FORM-11 | super_admin SHALL สร้างได้ทั้ง `faculty` และ `university` scope | Must Have | Both | super_admin สร้างสอง scope ได้ |
| FR-FORM-12 | `university` scope SHALL ไม่ใช้ `form_target_roles` | Must Have | Backend | form university scope ไม่มี target role record |
| FR-FORM-13 | `faculty` scope SHALL ใช้ target roles ได้หลาย role | Must Have | Both | teacher และ staff ถูกเลือกพร้อมกันได้ |
| FR-FORM-14 | ฟอร์ม SHALL มีสถานะ `draft`, `open`, `closed` | Must Have | Backend | state transition ใช้งานได้ตาม policy |
| FR-FORM-15 | ฟอร์ม SHALL รองรับ `open_at` และ `close_at` แบบ optional | Must Have | Both | form save ได้ทั้งแบบมีและไม่มีเวลา |
| FR-FORM-16 | Scheduler SHALL auto-open และ auto-close form ตามเวลาที่กำหนด | Must Have | Backend | form เปลี่ยนสถานะอัตโนมัติภายใน SLA |
| FR-FORM-17 | ระบบ SHALL ใช้ optimistic locking ผ่าน `version` field | Must Have | Both | save พร้อม version conflict แล้วถูก reject หรือให้ diff |
| FR-FORM-18 | ระบบ SHALL รองรับ copy form เดิมเพื่อสร้าง form ใหม่ | Should Have | Both | duplicate form แล้วได้ form ใหม่สถานะ draft |
| FR-FORM-19 | ระบบ SHALL รองรับ form versioning และเก็บ snapshot คำถามทุกครั้งที่โครงสร้างเปลี่ยน | Must Have | Backend | แก้ form แล้วมี record ใน form_versions |
| FR-FORM-20 | ระบบ SHALL รองรับ rollback โดยสร้าง form ใหม่จาก snapshot เก่า ไม่ overwrite form ปัจจุบัน | Must Have | Backend | rollback แล้วได้ form draft ใหม่ |
| FR-FORM-21 | ฟอร์ม SHALL ผูกกับ WebsiteTarget ได้เมื่อเลือกจาก registry | Must Have | Both | websiteTargetId ถูกบันทึกลง form |
| FR-FORM-22 | ฟอร์ม SHALL ผูกกับ EvaluationRound ได้แบบ optional | Must Have | Both | evaluationRoundId ถูกบันทึกและ query ได้ |
| FR-FORM-23 | ฟอร์ม SHALL แสดง website metadata เช่น URL, owner faculty, category ในหน้ารายละเอียด form | Should Have | Frontend | form detail page แสดง metadata ครบ |
| FR-FORM-24 | ฟอร์ม SHALL รองรับ publish เฉพาะเมื่อ validation ผ่านครบ | Must Have | Both | field บังคับขาดหรือ URL invalid แล้ว publish ไม่ได้ |
| FR-FORM-25 | ระบบ SHALL บันทึก audit log เมื่อสร้าง publish unpublish duplicate rollback หรือ delete form | Must Have | Backend | ทุก action สำคัญมี audit log |

### FR-CRIT : Evaluation Criteria (FR-CRIT-01 ถึง FR-CRIT-08)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-CRIT-01 | ระบบ SHALL มี preset evaluation criteria มาตรฐาน PSU อย่างน้อย Design, Usability, Content, Performance, Mobile, Feedback | Must Have | Both | admin เลือก preset แล้วได้คำถามมาตรฐานครบ |
| FR-CRIT-02 | admin SHALL เลือก preset criteria เพื่อเติมลงในฟอร์มได้ทันที | Must Have | Frontend | กดเลือก preset แล้ว questions ถูกเพิ่มอัตโนมัติ |
| FR-CRIT-03 | admin SHALL สร้าง criteria ใหม่เองได้ | Must Have | Both | เพิ่ม criteria custom แล้วบันทึกได้ |
| FR-CRIT-04 | แต่ละ criteria SHALL มี `weight` กำหนดได้ | Must Have | Both | เปลี่ยน weight แล้ว score formula เปลี่ยนตาม |
| FR-CRIT-05 | score รวมของฟอร์ม SHALL คำนวณด้วย weighted average ของ criteria ที่เป็นคะแนน | Must Have | Backend | คำนวณคะแนนรวมตรงตามสูตรทดสอบ |
| FR-CRIT-06 | criteria แบบ Feedback SHALL รองรับ long text และไม่ถูกนำไปรวมเป็นตัวหารคะแนนเชิงตัวเลข | Must Have | Backend | long text ไม่ส่งผลต่อ numeric average |
| FR-CRIT-07 | ระบบ SHOULD แสดง criteria grouped by dimension ในหน้าประเมินและ dashboard | Should Have | Both | evaluator และ dashboard เห็น grouping ตามมิติ |
| FR-CRIT-08 | ระบบ SHALL บันทึก criteria version หรือ snapshot ภายใน form เพื่อไม่ให้ template update กระทบ form เดิม | Must Have | Backend | อัปเดต preset แล้ว form เก่าไม่เปลี่ยน |

### FR-TMPL : Template Management (FR-TMPL-01 ถึง FR-TMPL-10)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-TMPL-01 | ระบบ SHALL รองรับ template แบบ `global` และ `faculty` scope | Must Have | Both | list template แยกตาม scope ได้ |
| FR-TMPL-02 | super_admin SHALL จัดการ template ทุกตัวได้ | Must Have | Both | super_admin แก้ template ทุก faculty ได้ |
| FR-TMPL-03 | admin SHALL จัดการเฉพาะ template ของ faculty ตัวเอง | Must Have | Both | admin แก้ template ข้าม faculty ไม่ได้ |
| FR-TMPL-04 | ระบบ SHALL อนุญาตสร้าง form จาก template โดย clone snapshot เข้า form | Must Have | Both | สร้าง form จาก template แล้ว questions ถูก copy ลง form_questions |
| FR-TMPL-05 | ระบบ SHALL รองรับ deprecate template | Should Have | Both | template ถูก mark deprecated และเห็น label ชัดเจน |
| FR-TMPL-06 | template ที่ถูก deprecate SHALL ไม่กระทบ form ที่สร้างไปแล้ว | Must Have | Backend | form เดิมยังใช้งานได้ปกติ |
| FR-TMPL-07 | เมื่อ admin owner ถูก soft delete ระบบ SHALL โอน ownership ของ template ไป super_admin | Must Have | Backend | owner เดิมหายแล้ว template ยังมี owner ใหม่ |
| FR-TMPL-08 | super_admin SHALL clone template ข้าม faculty ได้ | Should Have | Both | super_admin clone template ไปอีก faculty ได้ |
| FR-TMPL-09 | admin SHALL clone ได้เฉพาะ template ของตัวเองภายใน faculty เดียวกัน | Should Have | Both | admin clone ข้าม faculty ไม่ได้ |
| FR-TMPL-10 | การอัปเดต template SHALL ไม่กระทบ form ที่สร้างไปแล้วเพราะใช้ immutable snapshot | Must Have | Backend | form เก่าคงคำถามเดิมหลัง template update |

### FR-EVAL : Evaluator Experience (FR-EVAL-01 ถึง FR-EVAL-08)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-EVAL-01 | หน้าประเมิน SHALL แสดงชื่อเว็บไซต์และ URL ก่อนคำถามทั้งหมด | Must Have | Frontend | evaluator เปิด form แล้วเห็น website info เหนือคำถาม |
| FR-EVAL-02 | ระบบ SHALL มีปุ่ม "เปิดเว็บไซต์เพื่อประเมิน" และเปิด URL ใน tab ใหม่ | Must Have | Frontend | กดปุ่มแล้ว browser เปิด tab ใหม่ได้ |
| FR-EVAL-03 | ระบบ SHALL log เวลาที่ผู้ประเมินกดปุ่มเปิดเว็บไซต์ | Must Have | Backend | มี timestamp `websiteOpenedAt` หลัง click |
| FR-EVAL-04 | ระบบ SHOULD แสดง `og:image` หรือ favicon ของเว็บไซต์ที่ประเมิน | Should Have | Both | website metadata ถูกดึงและแสดงใน evaluator view |
| FR-EVAL-05 | ระบบ MAY รองรับ preview website ใน iframe เมื่อ target site อนุญาต | Nice to Have | Frontend | iframe preview แสดงได้กับเว็บที่ไม่มี x-frame restriction |
| FR-EVAL-06 | ระบบ SHALL ใช้ soft gate โดยผู้ประเมินต้องกดเปิดเว็บก่อนจึง submit ได้ | Must Have | Both | ไม่กดเปิดเว็บแล้วกด submit ต้องถูก block |
| FR-EVAL-07 | ระบบ SHALL บันทึก metadata อย่างน้อย `formOpenedAt`, `websiteOpenedAt`, `submittedAt` | Must Have | Backend | response record หรือ related log เก็บเวลาทั้ง 3 จุดได้ |
| FR-EVAL-08 | ระบบ SHOULD แสดงสถานะว่า evaluator เคยเปิดเว็บไซต์แล้วหรือยัง | Should Have | Frontend | UI แสดง badge หรือ state หลัง click open |

### FR-RESP : Response Submission (FR-RESP-01 ถึง FR-RESP-08)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-RESP-01 | ผู้ประเมิน SHALL เห็นฟอร์มตาม scope, role และ faculty ที่ได้รับมอบหมาย | Must Have | Backend | query list form คืนเฉพาะ form ที่ควรเห็น |
| FR-RESP-02 | ระบบ SHALL แสดงสถานะ `ยังไม่ตอบ`, `ตอบแล้ว`, `หมดเวลาแล้ว` ต่อฟอร์ม | Must Have | Frontend | home list แสดงสถานะถูกต้องตาม DB |
| FR-RESP-03 | ผู้ประเมิน SHALL แก้ไขคำตอบได้จนกว่าฟอร์มจะปิด | Must Have | Both | form open อยู่แล้ว edit response ได้ |
| FR-RESP-04 | เมื่อฟอร์มปิด ระบบ SHALL block การ submit หรือ update เพิ่มเติม | Must Have | Backend | submit หลัง close ได้ 403 หรือ validation error |
| FR-RESP-05 | ระบบ SHALL ใช้ unique response ต่อ `form_id + user_id` | Must Have | Backend | user ส่งซ้ำแล้วเกิด upsert ไม่ใช่ create record ใหม่ |
| FR-RESP-06 | ระบบ SHALL เก็บคำตอบล่าสุดเป็น authoritative response | Must Have | Backend | update response แล้ว dashboard ใช้ค่าล่าสุด |
| FR-RESP-07 | ระบบ SHALL ไม่ให้ผู้ประเมินเห็นคำตอบของคนอื่น | Must Have | Backend | เรียก API response ของคนอื่นแล้วถูก reject |
| FR-RESP-08 | ระบบ SHALL บันทึก completion event เพื่อใช้คำนวณ response rate และ reminder suppression | Must Have | Backend | submit แล้วไม่รับ reminder รอบต่อไป |

### FR-USER : User Management (FR-USER-01 ถึง FR-USER-10)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-USER-01 | super_admin SHALL จัดการผู้ใช้ role `admin` และ `executive` ได้ | Must Have | Both | create update delete user ได้เฉพาะ role ที่กำหนด |
| FR-USER-02 | teacher, staff, student SHALL auto-create จาก PSU Passport login | Must Have | Backend | login ครั้งแรกแล้วมี user record ถูกสร้าง |
| FR-USER-03 | ระบบ SHALL รองรับ bulk import user จาก XLSX สำหรับ super_admin | Must Have | Both | import XLSX สำเร็จแล้วสร้างหรือ update user ได้หลายราย |
| FR-USER-04 | ระบบ SHALL validate file type, row count, required columns และ faculty existence ก่อน import | Must Have | Both | import ผิด schema แล้ว reject พร้อม error report |
| FR-USER-05 | ระบบ SHALL ใช้ soft delete user ผ่าน `deleted_at` | Must Have | Backend | delete user แล้ว record ยังอยู่พร้อม deleted_at |
| FR-USER-06 | ระบบ SHALL ซ่อน user ที่ soft delete จาก operational list โดย default | Must Have | Frontend | user deleted ไม่โผล่ใน list ปกติ |
| FR-USER-07 | เมื่อ user ถูก soft delete ระบบ SHALL revoke session และ token ทั้งหมด | Must Have | Backend | deleted user refresh token ใช้งานไม่ได้ |
| FR-USER-08 | ระบบ SHALL anonymize personal reference ใน response ตาม data lifecycle policy หลัง retention ครบ | Must Have | Backend | ข้อมูล PII ใน response เก่าถูก anonymize ตาม policy |
| FR-USER-09 | ระบบ SHALL บันทึก audit log ทุกครั้งที่ create update import delete หรือ override role | Must Have | Backend | action สำคัญทุกตัวมี audit log |
| FR-USER-10 | ระบบ SHOULD รองรับ search และ filter user ตาม role, faculty, status | Should Have | Frontend | admin filter user list ได้ตามเงื่อนไข |

### FR-NOTIF : Notification System (FR-NOTIF-01 ถึง FR-NOTIF-12)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-NOTIF-01 | ระบบ SHALL ส่ง notification เมื่อผู้ประเมินได้รับ assignment ประเมินเว็บไซต์ | Must Have | Backend | create/open form แล้วผู้รับเห็น email หรือ in-app |
| FR-NOTIF-02 | ข้อความแจ้งเตือน SHALL ระบุชื่อเว็บไซต์และ URL ที่ต้องประเมิน | Must Have | Backend | notification message มี website name และ URL |
| FR-NOTIF-03 | ระบบ SHALL ส่ง reminder ก่อน due date 3 วันสำหรับผู้ที่ยังไม่ตอบ | Must Have | Backend | pending user ได้รับ reminder 3 วันก่อนกำหนด |
| FR-NOTIF-04 | ระบบ SHALL ส่ง reminder ก่อน due date 1 วันสำหรับผู้ที่ยังไม่ตอบ | Must Have | Backend | pending user ได้รับ reminder 1 วันก่อนกำหนด |
| FR-NOTIF-05 | ระบบ SHALL ไม่ส่ง reminder ซ้ำให้ผู้ที่ตอบแล้ว | Must Have | Backend | submit แล้วไม่รับ reminder รอบถัดไป |
| FR-NOTIF-06 | ระบบ SHALL ใช้ idempotency flag ป้องกันการส่ง reminder ซ้ำจาก scheduler | Must Have | Backend | scheduler run ซ้ำแล้วไม่เกิด duplicate reminder |
| FR-NOTIF-07 | ระบบ SHALL รองรับ email retry 3 ครั้งที่ 1 นาที 5 นาที 15 นาที | Must Have | Backend | failed email ถูก retry ตามลำดับเวลา |
| FR-NOTIF-08 | หลัง retry ครบแล้วระบบ SHALL mark email เป็น `failed` และแจ้ง super_admin | Must Have | Backend | failed 3 ครั้งแล้วมี admin alert |
| FR-NOTIF-09 | ระบบ SHALL fallback เป็น in-app only เมื่อ email fail ครบ retry และ event รองรับ in-app | Must Have | Backend | email fail แต่ user ยังเห็น in-app |
| FR-NOTIF-10 | super_admin SHALL ดู delivery status ได้จาก NotificationLog หรือ admin panel | Should Have | Both | admin เปิดหน้าดู log delivery ได้ |
| FR-NOTIF-11 | user หรือ admin MAY resend notification เมื่อ status = failed ตาม policy ที่กำหนด | Nice to Have | Both | failed notification ถูก resend ได้ |
| FR-NOTIF-12 | ระบบ SHALL รองรับ mark-as-read และ unread count สำหรับ in-app notification | Must Have | Both | unread count ลดลงเมื่อกด read |

### FR-DASH : Dashboard & Analytics (FR-DASH-01 ถึง FR-DASH-12)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-DASH-01 | dashboard SHALL แสดงคะแนนเฉลี่ยต่อเว็บไซต์ | Must Have | Both | website card แสดง score average ได้ |
| FR-DASH-02 | dashboard SHALL แสดงคะแนนแยกมิติ Design, Usability, Content, Performance, Mobile | Must Have | Both | score by dimension ถูกคำนวณและแสดงครบ |
| FR-DASH-03 | dashboard SHALL แสดงจำนวนผู้ประเมินและ response rate ต่อฟอร์ม | Must Have | Both | response count และ rate ตรงกับข้อมูลจริง |
| FR-DASH-04 | dashboard SHALL แสดง ranking เว็บไซต์ภายใน faculty หรือมหาวิทยาลัยตามสิทธิ์ผู้ใช้ | Must Have | Both | executive เห็นทั้งมหาวิทยาลัย admin เห็นเฉพาะ faculty ตัวเอง |
| FR-DASH-05 | dashboard SHALL แสดง comparison ระหว่าง faculty | Should Have | Both | เลือกหลาย faculty แล้วเห็น comparison ได้ |
| FR-DASH-06 | dashboard SHALL แสดง trend รายเดือนหรือรายไตรมาสเมื่อมีข้อมูลหลายรอบ | Should Have | Both | chart trend แสดงคะแนนเปลี่ยนแปลงตามช่วงเวลา |
| FR-DASH-07 | dashboard SHALL คำนวณคะแนนรวมด้วย weighted average | Must Have | Backend | test score formula แล้วตรงตาม expected |
| FR-DASH-08 | dashboard SHALL filter ตาม EvaluationRound | Must Have | Both | เลือก round แล้วข้อมูลเปลี่ยนตาม |
| FR-DASH-09 | dashboard SHALL filter ตาม faculty, category, academic year | Should Have | Both | filter หลายตัวทำงานร่วมกันได้ |
| FR-DASH-10 | dashboard SHALL แสดง percentile rank ของแต่ละเว็บไซต์ใน scope ที่เลือก | Should Have | Backend | website card แสดง percentile ได้ |
| FR-DASH-11 | dashboard SHALL แสดง score card รายเว็บไซต์ | Must Have | Both | website score card เปิดดูข้อมูลรายเว็บได้ |
| FR-DASH-12 | dashboard SHOULD แสดง top strengths และ improvement areas จาก feedback summary หรือ manual tag | Nice to Have | Both | score card มีสรุป strengths และ improvements ได้ |

### FR-RANK : Website Ranking (FR-RANK-01 ถึง FR-RANK-08)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-RANK-01 | ระบบ SHALL มี leaderboard Top 10 เว็บไซต์คะแนนสูงสุด | Must Have | Both | หน้า ranking แสดง Top 10 ได้ |
| FR-RANK-02 | ระบบ SHALL มี Bottom 5 เว็บไซต์ที่คะแนนต่ำสุดเพื่อการติดตามเร่งด่วน | Must Have | Both | หน้า ranking แสดง Bottom 5 ได้ |
| FR-RANK-03 | ระบบ SHALL แสดง Most Improved เมื่อมีข้อมูลรอบก่อนหน้า | Should Have | Both | เว็บไซต์ที่คะแนนเพิ่มขึ้นมากสุดถูกจัดอันดับได้ |
| FR-RANK-04 | ระบบ SHALL มี Faculty Heatmap แสดง Faculty x Evaluation Dimension | Should Have | Frontend | heatmap แสดงสีตามคะแนนเฉลี่ยแต่ละมิติ |
| FR-RANK-05 | super_admin และ executive SHALL เห็น cross-faculty ranking ได้ | Must Have | Backend | executive เรียก ranking ทุก faculty ได้ |
| FR-RANK-06 | admin SHALL เห็น ranking เฉพาะ faculty ของตัวเอง | Must Have | Backend | admin query ข้าม faculty แล้วถูกจำกัด |
| FR-RANK-07 | ranking SHALL filter ตาม EvaluationRound, Faculty, Category, Academic Year | Must Have | Both | filter เปลี่ยนแล้วลำดับ ranking เปลี่ยนตาม |
| FR-RANK-08 | ranking SHALL ใช้เฉพาะข้อมูลที่ผ่าน minimum response threshold ตาม policy ที่กำหนด | Should Have | Backend | เว็บไซต์ response ต่ำกว่า threshold ถูก exclude หรือถูก mark ไว้ |

### FR-IE : Import / Export (FR-IE-01 ถึง FR-IE-15)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-IE-01 | ระบบ SHALL export โครงสร้าง form เป็น JSON ได้ | Must Have | Backend | download JSON แล้ว schema ถูกต้อง |
| FR-IE-02 | ระบบ SHALL import JSON ด้วย schema validation ก่อน save | Must Have | Both | JSON ผิด schema ถูก reject ก่อนบันทึก |
| FR-IE-03 | import JSON SHALL rollback ทั้งหมดเมื่อ validation fail กลางทาง | Must Have | Backend | import fail แล้ว DB ไม่มี partial record |
| FR-IE-04 | export JSON SHALL ไม่มี response data ของผู้ประเมิน | Must Have | Backend | file export ไม่มี answer payload |
| FR-IE-05 | ระบบ SHALL แสดง preview ก่อนยืนยัน import | Must Have | Frontend | ผู้ใช้เห็น question preview ก่อน confirm |
| FR-IE-06 | ระบบ SHALL รองรับ import conflict mode แบบ append หรือ replace | Should Have | Both | user เลือก mode แล้วระบบทำงานตามนั้น |
| FR-IE-07 | ระบบ SHALL export Excel ข้อมูลการประเมินได้ | Must Have | Backend | export xlsx แล้วมี row คำตอบและคะแนนครบ |
| FR-IE-08 | ระบบ SHALL export PDF รายงานคุณภาพเว็บไซต์รายเว็บได้สำหรับ super_admin และ admin | Must Have | Backend | export PDF รายเว็บแล้วไฟล์ถูกสร้างสำเร็จ |
| FR-IE-09 | executive SHALL export PDF ภาพรวมมหาวิทยาลัยได้ | Should Have | Backend | executive export summary PDF ได้ |
| FR-IE-10 | PDF website report SHALL มี cover page พร้อมชื่อเว็บ URL รอบประเมิน คะแนนรวม และโลโก้ PSU + EILA | Must Have | Backend | PDF หน้าแรกมีข้อมูลครบ |
| FR-IE-11 | PDF SHALL มีคะแนนแยกมิติ comparison และ trend เมื่อมีข้อมูลรอบก่อน | Should Have | Backend | PDF หน้า analytics มีข้อมูล comparison |
| FR-IE-12 | PDF SHALL มี watermark PSU และ timestamp | Must Have | Backend | เปิด PDF แล้วพบ watermark และ timestamp |
| FR-IE-13 | ระบบ SHALL รองรับส่ง PDF ทาง email ไป owner faculty ได้โดยตรง | Should Have | Backend | export and email report สำเร็จและมี log |
| FR-IE-14 | ระบบ SHALL export Website Ranking หรือ dashboard summary เป็น Excel ได้ | Should Have | Backend | ranking export ได้เป็น xlsx |
| FR-IE-15 | ระบบ SHALL รองรับ version compatibility ของ import JSON อย่างน้อย 1 major version ย้อนหลัง | Should Have | Backend | import JSON จาก version ก่อนหน้าที่รองรับได้สำเร็จ |

### FR-AUDIT : Audit Log (FR-AUDIT-01 ถึง FR-AUDIT-08)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-AUDIT-01 | ระบบ SHALL บันทึก audit log สำหรับ action สำคัญทุกประเภท | Must Have | Backend | create update delete login export มี audit record |
| FR-AUDIT-02 | audit log SHALL ใช้ SHA-256 hash chain แบบ append-only | Must Have | Backend | verify chain แล้ว record ทุกตัวต่อเนื่องถูกต้อง |
| FR-AUDIT-03 | audit log SHALL เก็บ `user_id`, `action`, `entity_type`, `entity_id`, old/new value, ip, prev_hash, hash, created_at` | Must Have | Backend | schema audit log มี field ครบ |
| FR-AUDIT-04 | super_admin SHALL ดู audit log ทั้งระบบได้ | Must Have | Both | super_admin เปิด audit log page ได้ |
| FR-AUDIT-05 | audit log SHALL เก็บอย่างน้อย 2 ปีใน primary store ก่อน archive | Must Have | Backend | record เก่ากว่า 2 ปีถูกจัดการตาม archive policy |
| FR-AUDIT-06 | scheduler SHALL archive audit log เก่าตาม policy และ purge เวลา 03:00 | Must Have | Backend | cron purge run เวลาใกล้ 03:00 และมี log |
| FR-AUDIT-07 | การ verify audit chain SHALL มี endpoint หรือ admin action สำหรับตรวจสอบความสมบูรณ์ | Should Have | Backend | verify endpoint return pass หรือ fail ได้ |
| FR-AUDIT-08 | การ action กับ WebsiteTarget, EvaluationRound, PDF export, role override และ token revoke SHALL ถูก audit | Must Have | Backend | action เหล่านี้มี audit record ตรวจสอบได้ |

### FR-DATA : Data Lifecycle & PDPA (FR-DATA-01 ถึง FR-DATA-10)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| FR-DATA-01 | ระบบ SHALL ใช้ soft delete ผ่าน `deleted_at` สำหรับ User, Form, Response, Answer, WebsiteTarget, EvaluationRound และ Template | Must Have | Backend | delete entity แล้ว record ยังอยู่พร้อม deleted_at |
| FR-DATA-02 | retention ของ User, Form, EvaluationRound SHALL เท่ากับ 7 ปี | Must Have | Backend | retention policy ใน scheduler และ docs ระบุ 7 ปี |
| FR-DATA-03 | Response และ Answer SHALL soft delete และ anonymize หลัง 7 ปีตาม policy | Must Have | Backend | data ครบ retention แล้ว PII ถูก anonymize |
| FR-DATA-04 | WebsiteTarget SHALL soft delete และ archive ได้โดยไม่จำกัดเวลาตาม policy archive | Should Have | Backend | website target deleted แล้วยังเรียก archive view ได้ |
| FR-DATA-05 | expired RefreshToken SHALL hard delete ได้ทันที | Must Have | Backend | token หมดอายุแล้ว job purge ลบออกได้ |
| FR-DATA-06 | AuditLog SHALL archive หลัง 2 ปีและเก็บรวมทั้งหมด 7 ปี | Must Have | Backend | audit เก่าถูกย้ายไป archive ก่อน purge |
| FR-DATA-07 | เมื่อ user ขอใช้สิทธิ์ลบข้อมูลตาม PDPA ระบบ SHALL มี workflow review approve reject โดย super_admin | Must Have | Both | ส่งคำขอแล้วมีสถานะ workflow และผลลัพธ์ |
| FR-DATA-08 | เมื่อคำขอ PDPA ได้รับอนุมัติ ระบบ SHALL anonymize ข้อมูลที่ลบได้และเก็บเฉพาะข้อมูลที่กฎหมายบังคับต้องเก็บ | Must Have | Backend | approved request แล้ว PII ไม่แสดงใน operational view |
| FR-DATA-09 | ทุก action ด้าน data lifecycle SHALL ถูกบันทึก audit log | Must Have | Backend | soft delete anonymize archive purge มี audit log |
| FR-DATA-10 | ระบบ SHALL ซ่อนข้อมูล soft deleted จากทุก operational list โดย default | Must Have | Frontend | list ปกติไม่เห็น deleted records |

---

## 4. Non-Functional Requirements (NFR)

### NFR-SEC : Security

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| NFR-SEC-01 | ระบบ SHALL บังคับใช้ HTTPS/TLS 1.2+ ทุก environment ที่ deploy จริง | Must Have | DevOps | เรียกผ่าน HTTP แล้วถูก redirect หรือ block |
| NFR-SEC-02 | ระบบ SHALL ปฏิบัติตาม OWASP Top 10 controls ที่เกี่ยวข้อง | Must Have | Both | security review ไม่พบช่องโหว่ระดับ critical ที่ยังไม่ปิด |
| NFR-SEC-03 | ระบบ SHALL ใช้ CSRF protection สำหรับ state-changing request เมื่อใช้ cookie-based flow | Must Have | Backend | request ไม่มี token ถูก reject |
| NFR-SEC-04 | ระบบ SHALL ใช้ parameterized query ผ่าน Drizzle ORM และห้าม raw query ที่ไม่ sanitize | Must Have | Backend | code review ไม่พบ unsafe raw query |
| NFR-SEC-05 | ระบบ SHALL rate limit ขั้นต่ำ 10 req/min per IP สำหรับ auth-sensitive endpoint | Must Have | Backend | ยิงเกิน limit แล้วได้ 429 |
| NFR-SEC-06 | ระบบ SHALL เข้ารหัส secret และ encryption key ตาม key management policy | Must Have | DevOps | secret ไม่อยู่ใน repo และถูกโหลดจาก secure store |
| NFR-SEC-07 | ระบบ SHALL เก็บ email และข้อมูลอ่อนไหวตาม policy encryption at rest | Must Have | Backend | PII field ถูกเข้ารหัสใน DB ตาม design |
| NFR-SEC-08 | ระบบ SHALL validate authorization ทั้งที่ middleware และ query layer | Must Have | Backend | query ข้าม faculty ไม่คืนข้อมูลแม้ bypass UI |
| NFR-SEC-09 | ระบบ SHALL บันทึก security event เช่น token reuse, repeated failed OTP, repeated unauthorized access | Must Have | Backend | event สำคัญมี security log |
| NFR-SEC-10 | ระบบ SHOULD รองรับ secure headers เช่น CSP, HSTS, X-Frame-Options ตามความเหมาะสม | Should Have | Both | security scan ผ่าน baseline header set |

### NFR-PERF : Performance & Scalability

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| NFR-PERF-01 | ระบบ SHALL รองรับ Normal Load 200 concurrent users | Must Have | Backend / DevOps | load test 200 users ผ่าน SLA |
| NFR-PERF-02 | ระบบ SHALL รองรับ Peak Load 500 concurrent users | Must Have | Backend / DevOps | load test 500 users ผ่าน SLA หลัก |
| NFR-PERF-03 | ระบบ SHALL รองรับ Stress Limit 800 concurrent users แบบ graceful degradation | Should Have | Backend / DevOps | stress test 800 users แล้วระบบไม่ crash |
| NFR-PERF-04 | GET request ทั่วไป SHALL มี response time < 1.0s P95 | Must Have | Backend | performance report ผ่านเกณฑ์ |
| NFR-PERF-05 | POST หรือ PATCH request ทั่วไป SHALL มี response time < 2.0s P95 | Must Have | Backend | performance report ผ่านเกณฑ์ |
| NFR-PERF-06 | Export PDF และ Excel SHALL มี response time หรือ queue acceptance < 10s P95 | Should Have | Backend | export trigger ภายใน 10 วินาที |
| NFR-PERF-07 | URL Validation HEAD request SHALL timeout ที่ 5 วินาที | Must Have | Backend | request นานเกิน 5 วินาทีถูกตัด |
| NFR-PERF-08 | DB connection pool SHOULD ใช้ 20 เป็น minimum และ 100 เป็น maximum ตาม environment | Should Have | Backend / DevOps | config แสดงค่า pool ตาม policy |
| NFR-PERF-09 | เมื่อ load เกิน capacity ระบบ SHALL queue export job, throttle background jobs หรือ reject ด้วย 429 แทนการล่ม | Must Have | Backend | overload แล้วไม่เกิด cascade failure |
| NFR-PERF-10 | ระบบ SHOULD monitor p95, p99, queue length, DB pool usage, scheduler lag | Should Have | DevOps | monitoring dashboard แสดง metric ครบ |

### NFR-AVAIL : Availability & Disaster Recovery

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| NFR-AVAIL-01 | ระบบ SHALL มี uptime target ไม่น้อยกว่า 99.5% ต่อเดือน | Must Have | DevOps | monthly availability report ไม่ต่ำกว่า 99.5% |
| NFR-AVAIL-02 | ระบบ SHALL มี RTO ไม่เกิน 4 ชั่วโมง | Must Have | DevOps | DR drill recover ได้ภายใน 4 ชั่วโมง |
| NFR-AVAIL-03 | ระบบ SHALL มี RPO ไม่เกิน 1 ชั่วโมง | Must Have | DevOps | ทดสอบ restore แล้ว data loss ไม่เกิน 1 ชั่วโมง |
| NFR-AVAIL-04 | PostgreSQL full backup SHALL ทำทุก 24 ชั่วโมง | Must Have | DevOps | backup job daily สำเร็จ |
| NFR-AVAIL-05 | incremental backup SHALL ทำทุก 1 ชั่วโมง | Must Have | DevOps | backup freshness ไม่เกิน 1 ชั่วโมง |
| NFR-AVAIL-06 | backup retention SHALL เท่ากับ 30 วัน | Must Have | DevOps | ตรวจพบ backup ย้อนหลังอย่างน้อย 30 วัน |
| NFR-AVAIL-07 | backup SHALL เก็บ off-site ที่ PSU Data Center สำรองหรือ equivalent | Must Have | DevOps | backup location แยก failure domain |
| NFR-AVAIL-08 | ระบบ SHALL มี `GET /health` และคืนอย่างน้อย `status`, `db`, `smtp`, `scheduler` | Must Have | Backend | health endpoint response ครบ field |
| NFR-AVAIL-09 | ระบบ SHOULD มี documented restore runbook และทดสอบอย่างน้อยรายไตรมาส | Should Have | DevOps | มีเอกสาร runbook และ DR drill report |
| NFR-AVAIL-10 | scheduler critical jobs SHOULD มี retry หรือ alert เมื่อทำงานไม่สำเร็จ | Should Have | Backend / DevOps | cron fail แล้วมี alert หรือ retry |

### NFR-ACCESS : Accessibility (WCAG 2.1 AA)

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| NFR-ACCESS-01 | ระบบ SHALL ผ่าน WCAG 2.1 AA อย่างน้อยสำหรับ Phase 1 และ Phase 2 features | Must Have | Frontend | accessibility audit ผ่านระดับ AA |
| NFR-ACCESS-02 | form field ทุกตัว SHALL มี label และ `aria-describedby` เมื่อมี help text หรือ error | Must Have | Frontend | screen reader อ่านชื่อและคำอธิบายได้ |
| NFR-ACCESS-03 | ระบบ SHALL รองรับ keyboard navigation ครบทุกฟังก์ชันหลัก | Must Have | Frontend | ใช้งานโดยไม่ใช้ mouse ได้ครบ flow หลัก |
| NFR-ACCESS-04 | Form Builder DnD SHALL มี keyboard alternative เช่นปุ่มขึ้นลง reorder | Must Have | Frontend | ใช้ keyboard reorder field ได้ |
| NFR-ACCESS-05 | color contrast SHALL >= 4.5:1 สำหรับ normal text และ >= 3:1 สำหรับ large text | Must Have | Frontend | design audit ผ่านค่า contrast |
| NFR-ACCESS-06 | error messages SHALL ประกาศผ่าน `aria-live="assertive"` | Must Have | Frontend | validation error ถูกอ่านอัตโนมัติ |
| NFR-ACCESS-07 | charts SHALL มี data table alternative | Must Have | Frontend | dashboard chart มี table คู่กัน |
| NFR-ACCESS-08 | focus indicator SHALL มองเห็นชัดเจนทุก interactive element | Must Have | Frontend | tab navigation แล้วเห็น focus state ทุกจุด |

### NFR-MAINT : Maintainability

| ID | Requirement | Priority | Assigned To | Acceptance Criteria |
|---|---|---|---|---|
| NFR-MAINT-01 | ระบบ SHALL ใช้ TypeScript ทั้ง frontend และ backend | Must Have | Both | build pipeline ไม่มี JS-only module ที่นอก policy |
| NFR-MAINT-02 | ระบบ SHALL ใช้ Zod shared schema สำหรับ validation FE และ BE ใน domain ที่ใช้ร่วมกัน | Must Have | Both | schema reuse ใน form payload และ import payload |
| NFR-MAINT-03 | ระบบ SHOULD แยก module ตาม domain เช่น auth, website, round, form, ranking, report | Should Have | Both | codebase โครงสร้างตาม domain boundaries |
| NFR-MAINT-04 | ระบบ SHALL มี migration history และ Drizzle schema ที่ตรวจสอบย้อนกลับได้ | Must Have | Backend | migration สามารถ apply บน environment ใหม่ได้ |
| NFR-MAINT-05 | ระบบ SHOULD มี API documentation สำหรับ internal team และ admin integration | Should Have | Backend | endpoint list และ request response summary พร้อมใช้งาน |
| NFR-MAINT-06 | ระบบ SHOULD มี automated test ครอบคลุม auth, scoring, ranking, export และ data lifecycle | Should Have | Both | CI ผ่าน test suite ของ domain สำคัญ |

---

## 5. Constraints & Assumptions

### 5.1 Technical Constraints
- Frontend SHALL ใช้ Next.js 14 App Router, TypeScript, Tailwind CSS, dnd-kit, React Hook Form + Zod
- Backend SHALL ใช้ Fastify, Node.js, TypeScript, **Drizzle ORM**
- Database SHALL ใช้ PostgreSQL
- Auth SHALL ใช้ PSU Passport + JWT
- Scheduler SHALL ใช้ node-cron
- Export SHALL ใช้ pdf-lib และ ExcelJS
- Validation SHALL ใช้ Zod ทั้ง FE และ BE ตามที่เหมาะสม

### 5.2 Business Constraints
- ระบบนี้ใช้สำหรับประเมินคุณภาพเว็บไซต์ PSU เท่านั้น ไม่ใช่ระบบ survey ทั่วไป
- เว็บไซต์เป้าหมายไม่มี hard-code และ admin ต้องเป็นผู้กำหนด URL เอง
- cross-faculty ranking เป็นสิทธิ์ของ super_admin และ executive เท่านั้น
- การลบข้อมูลต้องสอดคล้องกับ PDPA และ policy มหาวิทยาลัย

### 5.3 Operational Assumptions
- หน่วยงานเจ้าของเว็บไซต์ยอมรับการใช้ผลการประเมินเพื่อการพัฒนา
- ผู้ประเมินสามารถเข้าถึงเว็บไซต์เป้าหมายได้จากเครือข่ายที่ใช้งาน
- เว็บไซต์บางระบบอาจมี authentication ภายในของตัวเองและอาจไม่สามารถ preview แบบ iframe ได้

---

## 6. Appendix

### A. Database Schema (Drizzle) — Logical Summary

| Entity | วัตถุประสงค์ | Field สำคัญ |
|---|---|---|
| `WebsiteTarget` | ทะเบียนเว็บไซต์ | `id`, `name`, `url`, `category`, `ownerFacultyId`, `isActive`, `urlStatus`, `lastValidatedAt`, `deletedAt` |
| `EvaluationRound` | กลุ่มรอบประเมิน | `id`, `name`, `academicYear`, `semester`, `openDate`, `closeDate`, `scope`, `facultyId`, `status`, `createdById`, `deletedAt` |
| `EvaluationCriteria` | มิติเกณฑ์ประเมิน | `id`, `name`, `description`, `weight`, `isPreset`, `templateId` |
| `Form` | แบบประเมินเว็บไซต์ | เพิ่ม `websiteTargetId`, `evaluationRoundId`, `website_url`, `website_name`, `website_owner_faculty`, `version`, `deletedAt` |
| `Response` | คำตอบผู้ประเมิน | เพิ่ม `formOpenedAt`, `websiteOpenedAt`, `submittedAt`, `deletedAt` |
| `Template` | เกณฑ์ประเมินสำเร็จรูป | `scope`, `owner`, `deprecatedAt`, `deletedAt` |
| `RefreshToken` | session token store | `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `replacedByTokenId` |
| `AuditLog` | บันทึกการกระทำ | `action`, `entityType`, `entityId`, `prevHash`, `hash`, `createdAt` |

### B. API Endpoint List

| Domain | Endpoint หลัก |
|---|---|
| Auth | `GET /auth/psu`, `GET /auth/callback`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/revoke-all`, `GET /auth/me` |
| Website Registry | `GET /api/websites`, `POST /api/websites`, `PATCH /api/websites/:id`, `DELETE /api/websites/:id`, `POST /api/websites/import` |
| Evaluation Round | `GET /api/rounds`, `POST /api/rounds`, `PATCH /api/rounds/:id`, `POST /api/rounds/:id/close` |
| Forms | `GET /api/forms`, `POST /api/forms`, `PATCH /api/forms/:id`, `DELETE /api/forms/:id`, `POST /api/forms/:id/duplicate` |
| Form Versioning | `GET /api/forms/:id/versions`, `POST /api/forms/:id/rollback` |
| Responses | `GET /api/forms/:id/responses`, `POST /api/forms/:id/responses`, `PATCH /api/responses/:id` |
| Templates | `GET /api/templates`, `POST /api/templates`, `PATCH /api/templates/:id`, `POST /api/templates/:id/deprecate` |
| Notifications | `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all` |
| Reports | `GET /api/reports/websites/:id/pdf`, `GET /api/reports/ranking.xlsx`, `POST /api/reports/websites/:id/email` |
| Health | `GET /health` |

### C. Role Permission Matrix

| Capability | super_admin | admin | executive | teacher | staff | student |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Manage WebsiteTarget ทุก faculty | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage WebsiteTarget ใน faculty ตัวเอง | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create university round | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create faculty round | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create form | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create university scope form | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage templates ทุกตัว | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage own faculty templates | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Evaluate assigned website | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| View cross-faculty dashboard and ranking | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View faculty-only dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export PDF website report | ✅ | ✅ | ✅ ภาพรวม | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### D. Use Case Diagram — Textual View
