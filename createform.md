# Form Management

## Overview
Form = evaluation form to assess websites (MOOC, LibX, Faculty websites, etc.)
Created by: `super_admin`, `admin`
Used by: `teacher`, `staff`, `student` (evaluators)
Monitored by: `executive` (read-only dashboard)

---

## Roles & Permissions

| Role | Create | Publish | Edit | Close | Reopen | Delete/Archive | View | Dashboard |
|---|---|---|---|---|---|---|---|---|
| `super_admin` | ✅ Any scope | ✅ Any | ✅ All | ✅ All (log) | ✅ (log) | ✅ Archive + Hard delete (log) | ✅ All | ✅ All |
| `admin` | ✅ `faculty` scope only | ✅ Own | ✅ Own draft | ✅ Own open (log) | ❌ | ✅ Own archive only | ✅ Own faculty | ❌ |
| `executive` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ All open/closed (cross-faculty) | ✅ University |
| `teacher`/`staff`/`student` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Assigned/sent forms | ✅ My Evaluations |

---

## Organization (Auto-Set)

`super_admin` — choose any faculty (`ownerFacultyId` dropdown, full control)
`admin` — `ownerFacultyId` auto-set to own `faculty_id` from OAuth (no dropdown)

```typescript
// Enforced in controller
if (user.role === 'admin') {
  form.ownerFacultyId = user.facultyId  // locked
  form.scope = 'faculty'                // cannot create university scope
}
```

---

## Form Scope

| Scope | Who can create | Recipients on publish |
|---|---|---|
| `faculty` | `super_admin`, `admin` | Users in that faculty (filtered by `form_target_roles`) |
| `university` | `super_admin` only | All users (no target role filter per FR-FORM-12) |

Scope is set **at creation time**. Cannot change after publish.

---

## Form States (Lifecycle)

```
draft → open → closed
              ↑ (reopen: super_admin only)
```

| State | Description | Can Edit | Can Close | Can Reopen | Delete Action |
|---|---|---|---|---|---|
| `draft` | Created, not published | ✅ Yes | ❌ | ❌ | ✅ Archive (soft delete) |
| `open` | Published to evaluators | ✅ (versioning) | ✅ Creator/super_admin (log) | ❌ | ✅ Archive only (no hard delete) |
| `closed` | No more responses | ❌ | ❌ | ✅ `super_admin` only (log) | ✅ Archive only |
| archived | Soft deleted | ❌ | ❌ | ❌ | `super_admin` can hard delete |

---

## Publish = State Transition

No separate "send form" step. Publish = `draft` → `open`.

On publish:
1. System snapshots form + criteria + questions to `form_versions` table
2. Form status set to `open`
3. System sends notification to recipients per scope (FR-NOTIF-01)

Recipients determined by scope:
- `university` scope → all `teacher`/`staff`/`student`
- `faculty` scope → users in that faculty matching `form_target_roles`

---

## Edit Rules

**Draft form:**
- Anyone with access: edit freely, archive (soft delete)

**Open form (versioning — FR-FORM-19/20):**
- Edit saves snapshot to `form_versions` then increments `version`
- One form record in DB — not separate records per version
- Responses link to `form_id + version_number` in snapshot
- `super_admin`: must log reason
- Rollback = create new draft from snapshot (per FR-FORM-20)

**Closed form:**
- No edits allowed
- `super_admin` can reopen (log) → returns to `open`

---

## Versioning Model

```
forms table: { id, version: 3, status: 'open', ... }
form_versions table:
  { formId, versionNumber: 1, snapshot: { criteria, questions } }
  { formId, versionNumber: 2, snapshot: { criteria, questions } }
  { formId, versionNumber: 3, snapshot: { criteria, questions } }  ← current
```

Rollback: restore snapshot into draft (new draft, does not overwrite current open form).
Response data stays linked via `form_id + version_number` in snapshot.
Executive dashboard shows combined stats across all versions.

---

## Visibility Rules

| Role | Sees |
|---|---|
| `super_admin` | All forms (draft, open, closed, archived) + audit |
| `admin` | Forms where `ownerFacultyId = user.facultyId` only |
| `executive` | All `open`/`closed` forms across all faculties (no draft) |
| `teacher`/`staff`/`student` | Open forms assigned/sent to them |

---

## Audit Logging

All logged per FR-AUDIT:
- `form.create` — who, when, scope, faculty
- `form.publish` — draft → open, version
- `form.edit` — what changed, reason (required for super_admin)
- `form.close` — reason, timestamp
- `form.reopen` — reason, timestamp (`super_admin` only)
- `form.archive` — reason, timestamp
- `form.hard_delete` — reason, timestamp (`super_admin` only)
- `form.rollback` — restored versionId, timestamp
- `form.duplicate` — source formId

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/forms` | authenticated | List forms (scoped by role) |
| `GET` | `/api/v1/forms/:id` | authenticated | Get form + criteria + questions |
| `POST` | `/api/v1/forms` | `form.create` | Create form |
| `PATCH` | `/api/v1/forms/:id` | `form.create` | Update draft form |
| `DELETE` | `/api/v1/forms/:id` | `form.create` | Archive (soft delete) |
| `POST` | `/api/v1/forms/:id/publish` | `form.create` | Publish (draft → open) |
| `POST` | `/api/v1/forms/:id/close` | `form.create` | Close (open → closed) |
| `POST` | `/api/v1/forms/:id/reopen` | `form.reopen` (`super_admin` only) | Reopen (closed → open) |
| `GET` | `/api/v1/forms/:id/versions` | authenticated | List snapshots |
| `POST` | `/api/v1/forms/:id/versions/:vid/rollback` | `form.create` | Rollback to version |
| `POST` | `/api/v1/forms/:id/duplicate` | `form.create` | Duplicate as new draft |
| `GET` | `/api/v1/forms/:id/export.json` | `form.create` | Export JSON |
| `POST` | `/api/v1/forms/import.json` | `form.create` | Import JSON |
| `POST` | `/api/v1/forms/from-template/:templateId` | `form.create` | Create from template |

---

## Example Flow

**Step 1 — Admin creates form (draft)**
```
POST /api/v1/forms
{ title: "Evaluate MOOC 2567", scope: "faculty" }
→ ownerFacultyId auto-set from token, status: "draft"
```

**Step 2 — Admin publishes**
```
POST /api/v1/forms/:id/publish
→ snapshot saved to form_versions (v1)
→ status: "draft" → "open"
→ notifications sent to faculty users
```

**Step 3 — Evaluators respond (85 responses, v1)**

**Step 4 — Admin edits (versioning)**
```
PATCH /api/v1/forms/:id
→ snapshot saved (v2), version increments
→ form still "open", new responses link to v2
```

**Step 5 — Executive views dashboard**
```
GET /api/v1/dashboard
→ sees combined stats (v1 + v2 responses)
→ cross-faculty view (university-wide)
```

**Step 6 — Admin closes**
```
POST /api/v1/forms/:id/close
→ status: "open" → "closed"
→ no more submissions accepted
```

**Step 7 — Admin archives**
```
DELETE /api/v1/forms/:id
→ deletedAt set (soft delete), data preserved
→ hidden from default list, viewable in archives
```

**Step 8 — super_admin reopens if needed**
```
POST /api/v1/forms/:id/reopen
→ status: "closed" → "open", audit logged
```

---

## Summary

| Area | Rule |
|---|---|
| Create | `super_admin` (any scope), `admin` (faculty only, own org) |
| Scope | Set at creation — `faculty` or `university` |
| Publish | State transition draft→open; scope determines recipients automatically |
| View | `admin` own faculty; `executive` all open/closed (cross-faculty); `super_admin` all |
| Edit | Draft (free); Open (versioning + snapshot); Closed (no) |
| Close/Reopen | Close: creator (admin/super_admin); Reopen: `super_admin` only |
| Delete | Archive = soft delete; Hard delete = `super_admin` only |
| Versioning | One form record + `form_versions` snapshot table (FR-FORM-19/20) |
| Audit | All `super_admin` actions logged; close/reopen always logged |
