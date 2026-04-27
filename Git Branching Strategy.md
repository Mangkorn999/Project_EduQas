# 🌿 EILA — Git Branching Strategy
> **Model:** GitHub Flow + Protected Main ปรับสำหรับ 2 Interns
> **เป้าหมาย:** เรียนรู้ Git workflow จริง, ป้องกัน conflict, review ซึ่งกันและกัน

---

## 📐 Branch Structure

main                          ← Production-ready เสมอ (protected)
└── develop                   ← Integration branch รวมงานทุกคน
├── feature/core-base-schema      ← Dev A
├── feature/core-auth             ← Dev A
├── feature/core-website-round    ← Dev A
├── feature/core-scoring          ← Dev A
├── feature/ux-forms              ← Dev B
├── feature/ux-evaluator          ← Dev B
├── feature/ux-notifications      ← Dev B
└── feature/ux-audit              ← Dev B
---

## 🔒 Branch Protection Rules

| Branch | Rule |
|---|---|
| `main` | ❌ Push ตรงไม่ได้, ✅ Merge จาก `develop` เท่านั้น, ต้องผ่าน Review 1 คน |
| `develop` | ❌ Push ตรงไม่ได้, ✅ Merge จาก `feature/*` ผ่าน PR เท่านั้น |
| `feature/*` | ✅ Push ได้เสรี, แต่ต้อง PR เข้า `develop` |

---

## 🏷️ Branch Naming Convention

feature/core-<domain>    → Dev A  (backend/schema/algorithm)
feature/ux-<domain>      → Dev B  (UI/form/notification)
fix/core-<issue>         → Dev A  hotfix
fix/ux-<issue>           → Dev B  hotfix
feature/shared-<topic>   → ทั้งคู่ต้อง review (shared files)
### ตัวอย่าง
```bash
feature/core-base-schema
feature/core-auth
feature/core-website-round
feature/core-scoring
feature/ux-forms
feature/ux-evaluator
feature/ux-notifications
feature/ux-audit
feature/shared-zod-schemas    ← ต้องให้ทั้งคู่ approve
🔄 Workflow ทีละขั้นตอน1. เริ่ม Task ใหม่# อยู่ที่ develop ก่อนเสมอ
git checkout develop
git pull origin develop

# สร้าง branch ใหม่จาก develop
git checkout -b feature/core-auth
2. ทำงานและ Commit# Commit บ่อยๆ ทุก logical unit
git add .
git commit -m "feat(auth): implement JWT rotation with reuse detection"

# Push ขึ้น remote
git push origin feature/core-auth
3. อัปเดต Branch ให้ทันกับ develop เสมอ# ทำทุกวัน หรือก่อนทำ PR
git fetch origin
git rebase origin/develop
# ถ้ามี conflict → แก้ → git rebase --continue
4. เปิด Pull Request → developTitle: feat(auth): JWT rotation + reuse detection
Description:
  ## What
  - Implement refresh token rotation
  - Add reuse detection → revoke-all

  ## SRS Reference
  - SRS2.1 Section 4.2 Auth

  ## Checklist
  - [x] Tests pass
  - [x] api-contracts.md updated
  - [x] No console.log
5. Review ซึ่งกันและกัน
Dev A เปิด PR → Dev B ต้อง review
Dev B เปิด PR → Dev A ต้อง review
ถ้า PR แตะ shared files → ทั้งคู่ต้อง approve
6. Merge Strategyfeature/* → develop    ใช้  Squash Merge   (history สะอาด)
develop  → main        ใช้  Merge Commit   (เก็บ history ครบ)
📝 Commit Message Convention<type>(<scope>): <short description>

type:
  feat     → feature ใหม่
  fix      → แก้ bug
  schema   → เปลี่ยน DB schema/migration
  test     → เพิ่ม/แก้ test
  docs     → แก้ documentation
  refactor → ปรับ code โดยไม่เพิ่ม feature
  chore    → งาน setup, config

scope = ชื่อ module เช่น auth, forms, scoring, evaluator
ตัวอย่าง Commit ที่ดีfeat(auth): add PSU Passport OAuth2 callback handler
schema(users): add sessions table with refresh token hash
fix(evaluator): prevent submit before website_opened event
test(scoring): add golden dataset snapshot test
docs(api): publish /rankings response shape to api-contracts.md
⚠️ Shared File Rules (สำคัญมาก)ไฟล์เหล่านี้ถ้าจะแก้ต้องแจ้งกันก่อนไฟล์เจ้าของหลักRuleSRS2.1.mdทั้งคู่ห้ามแก้โดยไม่ปรึกษาdocs/design/api-contracts.mdDev A เขียน, Dev B อ่าน1 คนแก้ต่อวันdocs/design/db-schema.mdDev ADev B review onlypackages/shared/schemas/*Dev A proposeDev B integratedb/migrations/*Dev A เท่านั้นDev B ห้ามสร้าง/แก้ migration.env.exampleทั้งคู่ต้องทำ PR แยก + ใส่ rollback note🚦 PR Checklist ก่อน Request Review- [ ] Branch rebase จาก develop ล่าสุดแล้ว
- [ ] Tests ผ่านทั้งหมด (local)
- [ ] ไม่มี console.log ใน production paths
- [ ] ไม่มี hardcoded secret/credential
- [ ] api-contracts.md อัปเดตถ้าเพิ่ม/เปลี่ยน endpoint
- [ ] SRS2.1 section อ้างอิงใน PR description
- [ ] PR size < 500 LOC (ถ้าเกิน ให้แตก PR)
🗓️ Daily Git Routine (ควรทำทุกวัน)# เช้า — sync ก่อนทำงาน
git fetch origin
git rebase origin/develop   # บน feature branch ของตัวเอง

# ระหว่างวัน — commit บ่อยๆ
git commit -m "feat(forms): add drag-drop reorder with dnd-kit"

# เย็น — push ขึ้น remote
git push origin feature/ux-forms
🆘 วิธีแก้ Conflict (สำหรับ Intern)# 1. เกิด conflict ระหว่าง rebase
git rebase origin/develop

# 2. Git บอกว่ามี conflict ที่ไฟล์ไหน
# แก้ไฟล์นั้น → เลือกเก็บ code ของใคร หรือรวมกัน

# 3. หลังแก้แล้ว
git add <file-ที่แก้>
git rebase --continue

# 4. ถ้างงมาก → ยกเลิกแล้วเริ่มใหม่
git rebase --abort
# แล้วไปปรึกษาอีก dev ก่อน
📊 ภาพรวม Timeline Branchdevelop ──────────────────────────────────────────► 
         │                    │
         ├─ core-base-schema ─┤ (Dev A, merge ก่อน = unblock Dev B)
         │                    │
         ├─ core-auth ────────────────┤
         │                            │
         ├─ ux-forms ─────────────────────────┤
         │                    │               │
         ├─ core-website-round────────┤       │
         │                            │       │
         ├─ ux-evaluator ─────────────────────────────┤
         │                                            │
         ├─ core-scoring ─────────────────────────────────┤
         │                                                 │
         └─ ux-audit ──────────────────────────────────────────┤
🎓 สิ่งที่ Intern จะได้เรียนจาก Git Workflow นี้ทักษะDev ADev BFeature branching✅✅Rebase vs Merge✅✅Conflict resolution✅✅Code review✅ (review Dev B)✅ (review Dev A)Commit message convention✅✅PR description writing✅✅Protected branch workflow✅✅