# 🌿 EILA — Git Branching Strategy
> **Model:** GitHub Flow + Protected Main ปรับสำหรับ 2 Interns
> **เป้าหมาย:** เรียนรู้ Git workflow จริง, ป้องกัน conflict, review ซึ่งกันและกัน

---

## 📐 Branch Structure

main                               ← Production-ready เสมอ (protected)
└── develop                        ← Integration branch รวมงานทุกคน
├── feature/core-base-schema   ← Mangkorn
├── feature/core-auth          ← Mangkorn
├── feature/core-website-round ← Mangkorn
├── feature/core-scoring       ← Mangkorn
├── feature/ux-forms           ← TEN
├── feature/ux-evaluator       ← TEN
├── feature/ux-notifications   ← TEN
└── feature/ux-audit           ← TEN
---

## 🔒 Branch Protection Rules

| Branch | Push ตรง | Merge จาก | เงื่อนไข |
|---|---|---|---|
| `main` | ❌ | `develop` เท่านั้น | ผ่าน Review 1 คน |
| `develop` | ❌ | `feature/*` เท่านั้น | ผ่าน PR เท่านั้น |
| `feature/*` | ✅ | — | ต้อง PR เข้า `develop` |

---

## 🏷️ Branch Naming Convention

feature/core-<domain>    → Mangkorn  (backend / schema / algorithm)
feature/ux-<domain>      → TEN       (UI / form / notification)
fix/core-<issue>         → Mangkorn  hotfix
fix/ux-<issue>           → TEN       hotfix
feature/shared-<topic>   → ทั้งคู่ต้อง review
### ตัวอย่าง

feature/core-base-schema
feature/core-auth
feature/core-website-round
feature/core-scoring
feature/ux-forms
feature/ux-evaluator
feature/ux-notifications
feature/ux-audit
feature/shared-zod-schemas    ← ต้องให้ทั้งคู่ approve
---

## 🔄 Workflow ทีละขั้นตอน

### Step 1 — เริ่ม Task ใหม่

```bash
# อยู่ที่ develop ก่อนเสมอ
git checkout develop
git pull origin develop

# สร้าง branch ใหม่จาก develop
git checkout -b feature/core-auth
Step 2 — ทำงานและ Commit# Commit บ่อยๆ ทุก logical unit
git add .
git commit -m "feat(auth): implement JWT rotation with reuse detection"

# Push ขึ้น remote
git push origin feature/core-auth
Step 3 — อัปเดต Branch ให้ทันกับ develop เสมอ# ทำทุกวัน หรือก่อนทำ PR
git fetch origin
git rebase origin/develop

# ถ้ามี conflict → แก้ → แล้วรัน
git add <file-ที่แก้>
git rebase --continue

# ถ้างงมาก → ยกเลิกแล้วเริ่มใหม่
git rebase --abort
Step 4 — เปิด Pull Request → developTitle: feat(auth): JWT rotation + reuse detection

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
Step 5 — Review ซึ่งกันและกันMangkorn เปิด PR  →  TEN ต้อง review
TEN เปิด PR       →  Mangkorn ต้อง review
PR แตะ shared files  →  ทั้งคู่ต้อง approve
Step 6 — Merge Strategyfeature/* → develop    ใช้  Squash Merge    (history สะอาด)
develop   → main       ใช้  Merge Commit    (เก็บ history ครบ)
📝 Commit Message Convention<type>(<scope>): <short description>

type:
  feat      → feature ใหม่
  fix       → แก้ bug
  schema    → เปลี่ยน DB schema / migration
  test      → เพิ่ม / แก้ test
  docs      → แก้ documentation
  refactor  → ปรับ code โดยไม่เพิ่ม feature
  chore     → งาน setup, config

scope = ชื่อ module เช่น auth, forms, scoring, evaluator
ตัวอย่าง Commit ที่ดีfeat(auth): add PSU Passport OAuth2 callback handler
schema(users): add sessions table with refresh token hash
fix(evaluator): prevent submit before website_opened event
test(scoring): add golden dataset snapshot test
docs(api): publish /rankings response shape to api-contracts.md
⚠️ Shared File Rules
ไฟล์เหล่านี้ถ้าจะแก้ ต้องแจ้งกันก่อนเสมอ
ไฟล์เจ้าของหลักRuleSRS2.1.mdทั้งคู่ห้ามแก้โดยไม่ปรึกษาdocs/design/api-contracts.mdMangkorn เขียน, TEN อ่าน1 คนแก้ต่อวันdocs/design/db-schema.mdMangkornTEN review onlypackages/shared/schemas/*Mangkorn proposeTEN integratedb/migrations/*Mangkorn เท่านั้นTEN ห้ามสร้าง / แก้ migration.env.exampleทั้งคู่ต้องทำ PR แยก + ใส่ rollback note🚦 PR Checklist ก่อน Request Review- [ ] Branch rebase จาก develop ล่าสุดแล้ว
- [ ] Tests ผ่านทั้งหมด (local)
- [ ] ไม่มี console.log ใน production paths
- [ ] ไม่มี hardcoded secret / credential
- [ ] api-contracts.md อัปเดตถ้าเพิ่ม / เปลี่ยน endpoint
- [ ] SRS2.1 section อ้างอิงใน PR description
- [ ] PR size < 500 LOC (ถ้าเกิน ให้แตก PR)
🗓️ Daily Git Routine# ☀️ เช้า — sync ก่อนทำงาน
git fetch origin
git rebase origin/develop        # บน feature branch ของตัวเอง

# 💻 ระหว่างวัน — commit บ่อยๆ
git add .
git commit -m "feat(forms): add drag-drop reorder with dnd-kit"

# 🌙 เย็น — push ขึ้น remote ก่อนเลิก
git push origin feature/ux-forms
🆘 วิธีแก้ Conflict# 1. เริ่ม rebase แล้วเจอ conflict
git rebase origin/develop

# 2. Git บอกว่ามี conflict ที่ไฟล์ไหน
# เปิดไฟล์นั้น → แก้ <<<<<<, =======, >>>>>>> ออก
# เก็บ code ที่ถูกต้อง

# 3. หลังแก้แล้ว
git add <file-ที่แก้>
git rebase --continue

# 4. ถ้างงมาก → ยกเลิก ปรึกษาอีก dev ก่อน
git rebase --abort
📊 Timeline Branchdevelop ──────────────────────────────────────────────────────►
    │
    ├─ core-base-schema ──┤
    │                     │ (Mangkorn merge ก่อน = unblock TEN)
    ├─ core-auth ─────────────────┤
    │                             │
    ├─ ux-forms ──────────────────────────┤
    │                             │       │
    ├─ core-website-round ────────┤       │
    │                                     │
    ├─ ux-evaluator ──────────────────────────────┤
    │                                             │
    ├─ core-scoring ──────────────────────────────────┤
    │                                                  │
    └─ ux-audit ───────────────────────────────────────────┤
🎓 สิ่งที่ได้เรียนจาก Workflow นี้ทักษะMangkornTENFeature branching✅✅Rebase vs Merge✅✅Conflict resolution✅✅Code review✅ review TEN✅ review MangkornCommit message convention✅✅PR description writing✅✅Protected branch workflow✅✅
📅 Last Updated: April 2026
👥 Mangkorn (Dev A — Core) · TEN (Dev B — UX)
📁 Project: EILA — PSU Internal Website Evaluation Platform
