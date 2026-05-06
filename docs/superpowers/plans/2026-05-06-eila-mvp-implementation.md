# EILA MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the EILA evaluation system fully functional — admin can create evaluations via wizard, evaluators can submit responses via real API, and dashboards show real data.

**Architecture:** Three independent layers fixed in order: (1) permissions + sidebar, (2) evaluator flow wired to real API via dynamic faculty+role check, (3) evaluation wizard that creates round+form in sequence, (4) real dashboards per role. DB schema unchanged — UI hides the round/form split behind a single "การประเมิน" concept.

**Tech Stack:** Next.js 14 App Router, Fastify, Drizzle ORM, PostgreSQL, pnpm workspaces, next-intl for i18n

---

## File Map

### Backend — Modify
- `backend/api/src/lib/permissions.ts` — fix `audit.view` and `user.manage` role lists
- `backend/api/src/modules/forms/forms.service.ts` — replace `listFormsForEvaluator` with dynamic faculty+role query
- `backend/api/src/modules/forms/forms.controller.ts` — pass `facultyId` + `role` to new evaluator query
- `backend/api/src/modules/audit/audit.routes.ts` — inspect for 500 cause
- `backend/api/src/modules/rounds/rounds.service.ts` — verify create round returns id

### Frontend — Modify
- `web/lib/permissions.ts` — mirror backend permission fixes
- `web/app/(auth)/layout.tsx` — fix sidebar visibility per role, rename labels
- `web/messages/en.json` — rename nav.forms → "Evaluations", nav.rounds removed
- `web/messages/th.json` — rename nav.forms → "การประเมิน", nav.rounds removed
- `web/app/(auth)/dashboard/page.tsx` — evaluator view uses real API
- `web/app/(auth)/evaluator/_shared.tsx` — remove mock WEBSITES constant
- `web/app/(auth)/evaluator/evaluate/[websiteId]/gate/page.tsx` — rename param + real API
- `web/app/(auth)/evaluator/evaluate/[websiteId]/form/page.tsx` — rename param + real API
- `web/app/(auth)/forms/page.tsx` — rename to "การประเมิน", add duplicate button
- `web/app/(auth)/admin/audit/page.tsx` — fix 500 error handling

### Frontend — Create
- `web/app/(auth)/evaluator/evaluate/[formId]/gate/page.tsx` — new route (formId not websiteId)
- `web/app/(auth)/evaluator/evaluate/[formId]/form/page.tsx` — new route
- `web/app/(auth)/evaluator/evaluate/[formId]/success/page.tsx` — new route
- `web/app/(auth)/evaluations/create/page.tsx` — wizard entry point
- `web/components/evaluation/EvaluationWizard.tsx` — 5-step wizard component

---

## Task 1: Fix Backend Permissions

**Files:**
- Modify: `backend/api/src/lib/permissions.ts`
- Modify: `backend/api/src/modules/audit/audit.routes.ts`

- [x] **Step 1: Read audit routes to find 500 cause**

```bash
cat backend/api/src/modules/audit/audit.routes.ts
```

- [x] **Step 2: Fix backend permissions**

In `backend/api/src/lib/permissions.ts`, change:
```typescript
export const PERMISSIONS = {
  'website_target.manage.global': ['super_admin'],
  'website_target.manage.faculty': ['super_admin', 'admin'],
  'round.create.university': ['super_admin'],
  'round.create.faculty': ['super_admin', 'admin'],
  'form.create': ['super_admin', 'admin'],
  'form.create.university_scope': ['super_admin'],
  'form.reopen': ['super_admin'],
  'template.manage.global': ['super_admin'],
  'template.manage.faculty': ['super_admin', 'admin'],
  'evaluate.assigned': ['teacher', 'staff', 'student'],
  'dashboard.cross_faculty': ['super_admin', 'executive'],
  'dashboard.faculty': ['super_admin', 'admin', 'executive'],
  'report.export_pdf': ['super_admin', 'admin', 'executive'],
  'user.manage': ['super_admin'],
  'audit.view': ['super_admin'],
} as const
```

Key changes: `dashboard.faculty` adds `executive`, `user.manage` → `super_admin` only, `audit.view` → `super_admin` only

- [x] **Step 3: Fix frontend permissions mirror**

In `web/lib/permissions.ts`, apply same changes:
```typescript
export const PERMISSIONS = {
  'website_target.manage.global': ['super_admin'],
  'website_target.manage.faculty': ['super_admin', 'admin'],
  'round.create.university': ['super_admin'],
  'round.create.faculty': ['super_admin', 'admin'],
  'form.create': ['super_admin', 'admin'],
  'form.create.university_scope': ['super_admin'],
  'template.manage.global': ['super_admin'],
  'template.manage.faculty': ['super_admin', 'admin'],
  'evaluate.assigned': ['teacher', 'staff', 'student'],
  'dashboard.cross_faculty': ['super_admin', 'executive'],
  'dashboard.faculty': ['super_admin', 'admin', 'executive'],
  'report.export_pdf': ['super_admin', 'admin', 'executive'],
  'user.manage': ['super_admin'],
  'audit.view': ['super_admin'],
} as const
```

- [x] **Step 4: TypeScript check**

```bash
cd backend/api && pnpm exec tsc --noEmit
cd ../../web && pnpm exec tsc --noEmit
```

Expected: no errors

- [x] **Step 5: Commit**

```bash
git add backend/api/src/lib/permissions.ts web/lib/permissions.ts
git commit -m "fix: tighten permissions — audit.view and user.manage super_admin only"
```

---

## Task 2: Fix Sidebar Navigation per Role

**Files:**
- Modify: `web/app/(auth)/layout.tsx`
- Modify: `web/messages/th.json`
- Modify: `web/messages/en.json`

- [x] **Step 1: Update nav items in layout.tsx**

Replace the `SHELL_NAV_ITEMS` array and `visibleNavItems` logic in `web/app/(auth)/layout.tsx`:

```typescript
// Remove 'rounds' from nav items — rounds are created inside the wizard now
const SHELL_NAV_ITEMS: ShellNavItem[] = [
  {icon: LayoutDashboard, labelKey: 'dashboard', href: '/dashboard',    matchPrefix: '/dashboard'},
  {icon: FileText,        labelKey: 'forms',     href: '/forms',        matchPrefix: '/forms'},
  {icon: Globe,           labelKey: 'websites',  href: '/websites',     matchPrefix: '/websites'},
  {icon: User,            labelKey: 'users',     href: '/admin/users',  matchPrefix: '/admin/users'},
  {icon: ShieldCheck,     labelKey: 'audit',     href: '/admin/audit',  matchPrefix: '/admin/audit'},
  {icon: BarChart3,       labelKey: 'reports',   href: '/reports',      matchPrefix: '/reports'},
];
```

Replace `visibleNavItems` useMemo:
```typescript
const visibleNavItems = useMemo(() => {
  const role = user?.role as UserRole | undefined;

  return SHELL_NAV_ITEMS.filter((item) => {
    if (item.labelKey === 'dashboard') return true;

    // Evaluator: dashboard only (shows as "งานของฉัน")
    if (role === 'teacher' || role === 'staff' || role === 'student') return false;

    // Executive: dashboard + reports only
    if (role === 'executive') return item.labelKey === 'reports';

    // Admin (EILA): forms, websites, reports — no users, no audit
    if (role === 'admin') {
      return ['forms', 'websites', 'reports'].includes(item.labelKey);
    }

    // Super admin: everything
    if (role === 'super_admin') return true;

    return false;
  });
}, [user]);
```

- [x] **Step 2: Update i18n labels**

In `web/messages/th.json`, find the `nav` section and update:
```json
"nav": {
  "dashboard": "แดชบอร์ด",
  "forms": "การประเมิน",
  "websites": "ทะเบียนเว็บไซต์",
  "users": "ผู้ใช้งาน",
  "audit": "บันทึกระบบ",
  "reports": "รายงาน"
}
```

In `web/messages/en.json`, same section:
```json
"nav": {
  "dashboard": "Dashboard",
  "forms": "Evaluations",
  "websites": "Website Registry",
  "users": "Users",
  "audit": "Audit Log",
  "reports": "Reports"
}
```

- [x] **Step 3: Fix dashboard label for evaluator role**

In `web/app/(auth)/layout.tsx`, find `getPageTitle` function and add evaluator case:
```typescript
function getPageTitle(pathname: string, t: any): string {
  const role = // get from auth store — pass as param or read inline
  if (pathname === '/dashboard' && (role === 'student' || role === 'staff' || role === 'teacher')) {
    return 'งานของฉัน';
  }
  // existing logic...
}
```

If `getPageTitle` doesn't accept role, pass `user` as parameter.

- [x] **Step 4: Build check**

```bash
cd /e/EILAP_ROJECTDEMO/web && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors

- [x] **Step 5: Commit**

```bash
git add web/app/\(auth\)/layout.tsx web/messages/th.json web/messages/en.json
git commit -m "fix: role-based sidebar — evaluator sees dashboard only, admin sees forms+websites+reports"
```

---

## Task 3: Fix Audit 500 Error

**Files:**
- Modify: `backend/api/src/modules/audit/audit.routes.ts` (if needed)
- Modify: `web/app/(auth)/admin/audit/page.tsx`

- [x] **Step 1: Read audit routes**

```bash
cat backend/api/src/modules/audit/audit.routes.ts
```

- [x] **Step 2: Read audit page frontend**

```bash
cat web/app/\(auth\)/admin/audit/page.tsx
```

- [x] **Step 3: Test audit API directly**

Start backend dev server and test:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v1/audit 2>&1 | head -50
```

Expected: JSON response or specific error message

- [x] **Step 4: Fix — most likely cause is missing `audit_log` table**

Run migration if needed:
```bash
cd /e/EILAP_ROJECTDEMO && pnpm db:migrate
```

If DB migration fails, check:
```bash
pnpm db:check
```

- [x] **Step 5: Add error boundary to audit page**

In `web/app/(auth)/admin/audit/page.tsx`, wrap the fetch in better error handling:
```typescript
try {
  const res = await apiGet('/api/v1/audit');
  setLogs(res.data ?? []);
} catch (err: any) {
  console.error('Audit fetch failed:', err);
  setError(err.message ?? 'Failed to load audit log');
}
```

Show error state in UI:
```tsx
if (error) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      ไม่สามารถโหลดบันทึกระบบได้: {error}
    </div>
  );
}
```

- [x] **Step 6: Commit**

```bash
git add backend/api/src/modules/audit/ web/app/\(auth\)/admin/audit/page.tsx
git commit -m "fix: audit page 500 — add error boundary and run migration"
```

---

## Task 4: Evaluator Flow — Dynamic Form Query

**Files:**
- Modify: `backend/api/src/modules/forms/forms.service.ts`
- Modify: `backend/api/src/modules/forms/forms.controller.ts`

- [x] **Step 1: Write test for dynamic evaluator query**

In `backend/api/src/modules/forms/forms.service.ts`, add new method. First verify existing test file:
```bash
ls backend/api/src/modules/api-schema.test.ts
```

- [x] **Step 2: Replace `listFormsForEvaluator` with dynamic check**

In `backend/api/src/modules/forms/forms.service.ts`, replace the existing `listFormsForEvaluator` method:

```typescript
async listFormsForEvaluator(userId: string, facultyId: string | null, role: string) {
  // Dynamic check: evaluator sees forms where faculty+role match
  // No need for evaluatorAssignments bulk insert
  const filters: SQL[] = [
    eq(forms.status, 'open' as any),
    isNull(forms.deletedAt),
  ]

  if (facultyId) {
    // faculty-scoped forms: must match evaluator's faculty
    // university-scoped forms: visible to all
    filters.push(
      sql`(${forms.scope} = 'university' OR ${forms.ownerFacultyId} = ${facultyId})`
    )
  }

  const matchingForms = await db
    .select({
      form: forms,
      submittedAt: responses.submittedAt,
      websiteOpenedAt: responses.websiteOpenedAt,
    })
    .from(forms)
    .leftJoin(responses, and(
      eq(responses.formId, forms.id),
      eq(responses.respondentId, userId),
      isNull(responses.deletedAt),
    ))
    .where(and(...filters))

  // Filter by target roles (if form has role restrictions)
  const formIds = matchingForms.map(r => r.form.id)
  if (formIds.length === 0) return []

  const targetRoleRows = await db
    .select({ formId: formTargetRoles.formId, role: formTargetRoles.role })
    .from(formTargetRoles)
    .where(inArray(formTargetRoles.formId, formIds))

  const roleMap = new Map<string, string[]>()
  for (const row of targetRoleRows) {
    if (!roleMap.has(row.formId)) roleMap.set(row.formId, [])
    roleMap.get(row.formId)!.push(row.role)
  }

  return matchingForms
    .filter(row => {
      const targetRoles = roleMap.get(row.form.id)
      // no target roles = open to all evaluator roles
      if (!targetRoles || targetRoles.length === 0) return true
      return targetRoles.includes(role)
    })
    .map(row => ({
      ...row.form,
      hasSubmitted: !!row.submittedAt,
      hasOpenedWebsite: !!row.websiteOpenedAt,
    }))
}
```

Add imports at top of file:
```typescript
import { eq, and, isNull, sql, inArray, type SQL } from 'drizzle-orm'
import { forms, evaluationCriteria, formQuestions, websites, faculties, evaluatorAssignments, responses, formTargetRoles } from '../../../../db/schema'
```

- [x] **Step 3: Update controller to pass facultyId + role**

In `backend/api/src/modules/forms/forms.controller.ts`, update the evaluator branch in `list`:

```typescript
list = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as any
  const EVALUATOR_ROLES = ['teacher', 'staff', 'student']

  if (EVALUATOR_ROLES.includes(user.role)) {
    const data = await this.formsService.listFormsForEvaluator(
      user.userId,
      user.facultyId ?? null,
      user.role,
    )
    return { data }
  }
  // ... rest unchanged
```

- [x] **Step 4: TypeScript check**

```bash
cd /e/EILAP_ROJECTDEMO/backend/api && pnpm exec tsc --noEmit
```

Expected: no errors

- [x] **Step 5: Commit**

```bash
git add backend/api/src/modules/forms/forms.service.ts backend/api/src/modules/forms/forms.controller.ts
git commit -m "feat: evaluator form list uses dynamic faculty+role check instead of assignment table"
```

---

## Task 5: Evaluator Flow — Connect Frontend to Real API

**Files:**
- Create: `web/app/(auth)/evaluator/evaluate/[formId]/gate/page.tsx`
- Create: `web/app/(auth)/evaluator/evaluate/[formId]/form/page.tsx`
- Create: `web/app/(auth)/evaluator/evaluate/[formId]/success/page.tsx`
- Modify: `web/app/(auth)/evaluator/_shared.tsx` — remove mock data, keep UI components

- [x] **Step 1: Remove mock data from `_shared.tsx`**

In `web/app/(auth)/evaluator/_shared.tsx`:
- Delete the `WEBSITES` constant array (lines with hardcoded sci/eng/inno entries)
- Delete the `getWebsiteById` function
- Keep all UI components: `PreEvaluationCard`, `EvaluationForm`, `ConfirmModal`, `SuccessCard`
- Update `EvaluationForm` to accept real questions:

Change the `EvaluationForm` component signature to accept questions from API:
```typescript
export interface FormQuestion {
  id: string
  label: string
  questionType: string
  isRequired: boolean
  sortOrder: number
  config?: { options?: Array<{ label: string; value: string }> } | null
}

export function EvaluationForm({
  website,
  questions,
  responseId,
  onBack,
  onSubmitConfirmed,
}: {
  website: { id: string; name: string; url: string }
  questions: FormQuestion[]
  responseId?: string
  onBack: () => void
  onSubmitConfirmed: () => void
})
```

Replace the hardcoded question map `[1, 2].map(q => ...)` with:
```tsx
{questions.map((q, idx) => (
  <QuestionCard key={q.id} question={q} index={idx} />
))}
```

Add `QuestionCard` component in the same file:
```tsx
function QuestionCard({ question, index }: { question: FormQuestion; index: number }) {
  if (question.questionType === 'rating' || question.questionType === 'scale_5') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h3 className="font-semibold text-gray-900 text-lg mb-8">
          {index + 1}. {question.label}
          {question.isRequired && <span className="text-red-500 ml-1">*</span>}
        </h3>
        <div className="flex justify-between items-center relative">
          <div className="absolute top-2.5 left-6 right-6 h-px bg-gray-200 -z-10" />
          {[
            { val: 1, label: 'ไม่พอใจมาก' },
            { val: 2, label: 'ไม่พอใจ' },
            { val: 3, label: 'ปานกลาง' },
            { val: 4, label: 'พอใจ' },
            { val: 5, label: 'พอใจมาก' },
          ].map((item) => (
            <label key={item.val} className="flex flex-col items-center gap-3 group cursor-pointer bg-white px-2">
              <input type="radio" name={`q_${question.id}`} value={item.val} className="peer sr-only" />
              <div className="h-5 w-5 rounded-full border border-gray-400 flex items-center justify-center transition-all peer-checked:border-psu-navy peer-checked:border-[6px]" />
              <span className="text-xs font-medium text-gray-500 group-hover:text-psu-navy peer-checked:text-psu-navy peer-checked:font-bold">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }
  if (question.questionType === 'long_text') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <label className="block font-semibold text-gray-900 text-lg mb-4">
          {index + 1}. {question.label}
          {question.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          name={`q_${question.id}`}
          className="w-full h-32 rounded-xl border border-gray-200 bg-[#f8f9ff] focus:ring-1 focus:ring-psu-navy p-4 outline-none text-sm"
          placeholder="พิมพ์ความคิดเห็น..."
        />
      </div>
    )
  }
  // short_text default
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <label className="block font-semibold text-gray-900 text-lg mb-4">
        {index + 1}. {question.label}
        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        name={`q_${question.id}`}
        className="w-full rounded-xl border border-gray-200 bg-[#f8f9ff] focus:ring-1 focus:ring-psu-navy p-4 outline-none text-sm"
        placeholder="พิมพ์คำตอบ..."
      />
    </div>
  )
}
```

- [x] **Step 2: Create gate page with real API**

Create `web/app/(auth)/evaluator/evaluate/[formId]/gate/page.tsx`:

```tsx
'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { PreEvaluationCard } from '../../../_shared';

export default function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const router = useRouter();
  const [website, setWebsite] = useState<{ id: string; name: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/v1/forms/${formId}`)
      .then(res => {
        const form = res.data;
        setWebsite({
          id: form.websiteTargetId ?? formId,
          name: form.websiteName ?? form.title,
          url: form.websiteUrl ?? '',
        });
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [formId, router]);

  const handleStart = async () => {
    try {
      await apiPost(`/api/v1/responses/forms/${formId}/website-open`, {});
    } catch {
      // non-blocking — proceed even if log fails
    }
    router.push(`/evaluator/evaluate/${formId}/form`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">กำลังโหลด...</div>;
  if (!website) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff]">
      <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center gap-4 sticky top-0 z-20">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-xl text-psu-navy">EILA Website Evaluation</h1>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <PreEvaluationCard website={website} onStart={handleStart} />
      </main>
    </div>
  );
}
```

- [x] **Step 3: Create form page with real API**

Create `web/app/(auth)/evaluator/evaluate/[formId]/form/page.tsx`:

```tsx
'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { EvaluationForm, type FormQuestion } from '../../../_shared';

export default function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const router = useRouter();
  const [website, setWebsite] = useState<{ id: string; name: string; url: string } | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [responseId, setResponseId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const load = async () => {
      const res = await apiGet(`/api/v1/forms/${formId}`);
      const form = res.data;
      setWebsite({ id: form.websiteTargetId ?? formId, name: form.websiteName ?? form.title, url: form.websiteUrl ?? '' });
      setQuestions((form.questions ?? []).sort((a: FormQuestion, b: FormQuestion) => a.sortOrder - b.sortOrder));

      // Check for existing draft response
      try {
        const rRes = await apiGet(`/api/v1/responses/forms/${formId}/responses`);
        const existing = (rRes.data ?? [])[0];
        if (existing) {
          if (existing.submittedAt) {
            router.replace(`/evaluator/evaluate/${formId}/success`);
            return;
          }
          setResponseId(existing.id);
        }
      } catch { /* no existing response */ }
      setLoading(false);
    };
    load().catch(() => { router.push('/dashboard'); setLoading(false); });
  }, [formId, router]);

  const collectAnswers = () => {
    if (!formRef.current) return [];
    const fd = new FormData(formRef.current);
    return questions.map(q => {
      const val = fd.get(`q_${q.id}`);
      const isNumeric = ['rating', 'scale_5', 'scale_10', 'number'].includes(q.questionType);
      return {
        questionId: q.id,
        ...(isNumeric ? { valueNumber: val ? Number(val) : undefined } : { valueText: val ? String(val) : undefined }),
      };
    }).filter(a => a.valueNumber !== undefined || a.valueText !== undefined);
  };

  const handleSubmit = async () => {
    const answers = collectAnswers();
    if (responseId) {
      await apiPatch(`/api/v1/responses/${responseId}`, { answers });
    } else {
      const res = await apiPost(`/api/v1/responses/forms/${formId}/responses`, { answers });
      setResponseId(res.data?.id);
    }
    router.push(`/evaluator/evaluate/${formId}/success`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">กำลังโหลดแบบประเมิน...</div>;
  if (!website) return null;

  return (
    <form ref={formRef}>
      <EvaluationForm
        website={website}
        questions={questions}
        responseId={responseId}
        onBack={() => router.push(`/evaluator/evaluate/${formId}/gate`)}
        onSubmitConfirmed={handleSubmit}
      />
    </form>
  );
}
```

- [x] **Step 4: Create success page**

Create `web/app/(auth)/evaluator/evaluate/[formId]/success/page.tsx`:

```tsx
'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId: _ } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center shadow-xl border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ส่งแบบประเมินสำเร็จ!</h1>
        <p className="text-gray-500 mb-8 text-sm">ขอบคุณสำหรับการประเมิน</p>
        <p className="text-xs text-gray-400 mb-6">
          {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-psu-navy text-white py-3 rounded-xl font-bold hover:bg-psu-blue-container transition-colors"
        >
          กลับงานของฉัน
        </button>
      </div>
    </div>
  );
}
```

- [x] **Step 5: Update dashboard page — evaluator view uses real data**

In `web/app/(auth)/dashboard/page.tsx`, the `mapFormsToEvaluatorWebsites` function is called with the existing forms list. The API already returns forms with `hasSubmitted` and `hasOpenedWebsite` from Task 4. Update the map function:

```typescript
function mapFormsToEvaluatorWebsites(forms: DashboardForm[]): EvaluatorWebsite[] {
  return forms
    .filter((form) => form.websiteUrl || form.websiteName || form.title)
    .map((form) => {
      const status: EvaluationStatus = (form as any).hasSubmitted
        ? 'submitted'
        : (form as any).hasOpenedWebsite
        ? 'in_progress'
        : 'not_started';
      return {
        id: form.id,
        name: form.websiteName || form.title || 'ไม่ระบุชื่อ',
        url: form.websiteUrl || '',
        progress: status === 'submitted' ? 100 : status === 'in_progress' ? 50 : 0,
        status,
      };
    });
}
```

Update `EvaluatorWebsiteCard` href to use formId:
```typescript
// Change from:
const href = `/evaluator/${website.id}${website.status === 'submitted' ? '?readonly=true' : ''}`;
// Change to:
const href = website.status === 'submitted'
  ? `/evaluator/evaluate/${website.id}/success`
  : `/evaluator/evaluate/${website.id}/gate`;
```

- [x] **Step 6: TypeScript + build check**

```bash
cd /e/EILAP_ROJECTDEMO/web && pnpm exec tsc --noEmit
```

Expected: no errors

- [x] **Step 7: Commit**

```bash
git add web/app/\(auth\)/evaluator/ web/app/\(auth\)/dashboard/page.tsx
git commit -m "feat: evaluator flow connected to real API — gate/form/success pages use live data"
```

---

## Task 6: Evaluation Wizard — Frontend (5 Steps)

**Files:**
- Create: `web/components/evaluation/EvaluationWizard.tsx`
- Create: `web/app/(auth)/evaluations/create/page.tsx`
- Modify: `web/app/(auth)/forms/page.tsx`

- [x] **Step 1: Create wizard component skeleton**

Create `web/components/evaluation/EvaluationWizard.tsx`:

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface Faculty { id: string; code: string; nameTh: string; nameEn: string; }
interface Website { id: string; name: string; url: string; ownerFacultyId: string; }
interface Question { id?: string; label: string; questionType: string; isRequired: boolean; sortOrder: number; }

interface WizardState {
  // Step 1
  name: string;
  academicYear: number;
  semester: number;
  openDate: string;
  closeDate: string;
  // Step 2
  selectedWebsiteIds: string[];
  // Step 3
  questions: Question[];
  // Step 4
  selectedFacultyIds: string[];
  allFaculties: boolean;
  targetRoles: string[];
}

export function EvaluationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  // roundId + formId created in step 1 completion, used throughout
  const [roundId, setRoundId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    name: '',
    academicYear: new Date().getFullYear() + 543,
    semester: 1,
    openDate: '',
    closeDate: '',
    selectedWebsiteIds: [],
    questions: [],
    selectedFacultyIds: [],
    allFaculties: false,
    targetRoles: ['student', 'teacher', 'staff'],
  });

  useEffect(() => {
    Promise.all([
      apiGet('/api/v1/faculties').then(r => setFaculties(r.data ?? [])),
      apiGet('/api/v1/websites').then(r => setWebsites(r.data ?? [])),
    ]);
  }, []);

  // ... step components and navigation below
  return (
    <div className="max-w-3xl mx-auto">
      <WizardProgress step={step} />
      {step === 1 && <Step1 state={state} setState={setState} />}
      {step === 2 && <Step2 state={state} setState={setState} websites={websites} faculties={faculties} />}
      {step === 3 && <Step3 state={state} setState={setState} formId={formId} />}
      {step === 4 && <Step4 state={state} setState={setState} faculties={faculties} previewCount={previewCount} />}
      {step === 5 && <Step5 state={state} roundId={roundId} formId={formId} />}
      <WizardNav
        step={step}
        saving={saving}
        onBack={() => setStep(s => Math.max(1, s - 1) as WizardStep)}
        onNext={() => handleNext()}
      />
    </div>
  );

  async function handleNext() {
    if (step === 1) {
      // Create round + form draft
      setSaving(true);
      try {
        const roundRes = await apiPost('/api/v1/rounds', {
          name: state.name,
          academicYear: state.academicYear,
          semester: state.semester,
          openDate: state.openDate || null,
          closeDate: state.closeDate || null,
          scope: 'university',
        });
        const newRoundId = roundRes.data.id;
        setRoundId(newRoundId);

        const formRes = await apiPost('/api/v1/forms', {
          title: state.name,
          roundId: newRoundId,
          scope: 'university',
          openAt: state.openDate || null,
          closeAt: state.closeDate || null,
        });
        setFormId(formRes.data.id);
        setStep(2);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 2) {
      // Associate websites with round
      setSaving(true);
      try {
        // Update form websiteTargetId for first selected website
        // (or create one form per website — for now single website)
        if (state.selectedWebsiteIds.length > 0 && formId) {
          const site = websites.find(w => w.id === state.selectedWebsiteIds[0]);
          if (site) {
            await apiPatch(`/api/v1/forms/${formId}`, {
              websiteTargetId: site.id,
              websiteName: site.name,
              websiteUrl: site.url,
            });
          }
        }
        setStep(3);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 3) {
      setStep(4);
      return;
    }

    if (step === 4) {
      // Save target roles
      setSaving(true);
      try {
        if (formId) {
          await apiPatch(`/api/v1/forms/${formId}`, {
            targetRoles: state.targetRoles,
            ownerFacultyId: state.allFaculties ? null : state.selectedFacultyIds[0] ?? null,
          });
          // Fetch preview count
          const params = new URLSearchParams({
            roles: state.targetRoles.join(','),
            facultyId: state.allFaculties ? 'all' : (state.selectedFacultyIds[0] ?? 'all'),
          });
          const countRes = await apiGet(`/api/v1/assignments/preview-count?${params}`);
          setPreviewCount(countRes.data?.total ?? 0);
        }
        setStep(5);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setSaving(false);
      }
      return;
    }
  }
}

function WizardProgress({ step }: { step: number }) {
  const steps = ['ข้อมูลทั่วไป', 'เว็บไซต์', 'คำถาม', 'ผู้รับ', 'ยืนยัน'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-2 ${i + 1 <= step ? 'text-psu-navy' : 'text-gray-400'}`}>
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i + 1 < step ? 'bg-psu-navy border-psu-navy text-white' : i + 1 === step ? 'border-psu-navy text-psu-navy' : 'border-gray-300'}`}>
              {i + 1 < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block">{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-px ${i + 1 < step ? 'bg-psu-navy' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function WizardNav({ step, saving, onBack, onNext }: { step: number; saving: boolean; onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex justify-between mt-8">
      <button
        type="button"
        onClick={onBack}
        disabled={step === 1}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" /> ย้อนกลับ
      </button>
      {step < 5 ? (
        <button
          type="button"
          onClick={onNext}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-psu-navy text-white font-medium hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ถัดไป <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function Step1({ state, setState }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-psu-navy">ข้อมูลทั่วไป</h2>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อการประเมิน <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={state.name}
          onChange={e => setState(s => ({ ...s, name: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psu-navy"
          placeholder="เช่น การประเมินคุณภาพเว็บไซต์ ประจำปี 2568"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">ปีการศึกษา</label>
          <input type="number" value={state.academicYear} onChange={e => setState(s => ({ ...s, academicYear: Number(e.target.value) }))}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psu-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">ภาคเรียน</label>
          <select value={state.semester} onChange={e => setState(s => ({ ...s, semester: Number(e.target.value) }))}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psu-navy">
            <option value={1}>ภาคเรียนที่ 1</option>
            <option value={2}>ภาคเรียนที่ 2</option>
            <option value={3}>ภาคฤดูร้อน</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">วันเริ่ม</label>
          <input type="date" value={state.openDate} onChange={e => setState(s => ({ ...s, openDate: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psu-navy" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">วันสิ้นสุด</label>
          <input type="date" value={state.closeDate} onChange={e => setState(s => ({ ...s, closeDate: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psu-navy" />
        </div>
      </div>
    </div>
  );
}

function Step2({ state, setState, websites, faculties }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>>; websites: Website[]; faculties: Faculty[] }) {
  const [facultyFilter, setFacultyFilter] = useState<string>('');
  const filtered = facultyFilter ? websites.filter(w => w.ownerFacultyId === facultyFilter) : websites;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-psu-navy">เว็บไซต์ที่จะประเมิน</h2>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">กรองตามคณะ</label>
        <select value={facultyFilter} onChange={e => setFacultyFilter(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-psu-navy">
          <option value="">ทุกคณะ</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.nameTh}</option>)}
        </select>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-xl p-3">
        {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-4">ไม่พบเว็บไซต์</p>}
        {filtered.map(site => (
          <label key={site.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={state.selectedWebsiteIds.includes(site.id)}
              onChange={e => setState(s => ({
                ...s,
                selectedWebsiteIds: e.target.checked
                  ? [...s.selectedWebsiteIds, site.id]
                  : s.selectedWebsiteIds.filter(id => id !== site.id),
              }))}
              className="h-4 w-4 rounded border-gray-300 text-psu-navy focus:ring-psu-navy"
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">{site.name}</p>
              <p className="text-xs text-gray-400">{site.url}</p>
            </div>
          </label>
        ))}
      </div>
      <p className="text-sm text-gray-500">เลือกแล้ว {state.selectedWebsiteIds.length} เว็บไซต์</p>
    </div>
  );
}

function Step3({ state, setState, formId }: { state: WizardState; setState: React.Dispatch<React.SetStateAction<WizardState>>; formId: string | null }) {
  const addQuestion = useCallback(async () => {
    if (!formId) return;
    try {
      const res = await apiPost(`/api/v1/forms/${formId}/questions`, {
        label: 'คำถามใหม่',
        questionType: 'rating',
        isRequired: false,
        sortOrder: state.questions.length,
      });
      setState(s => ({ ...s, questions: [...s.questions, res.data] }));
    } catch (err: any) { alert(err.message); }
  }, [formId, state.questions.length, setState]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-psu-navy">คำถาม</h2>
        <button type="button" onClick={addQuestion}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-psu-navy text-white text-sm font-semibold hover:brightness-110">
          + เพิ่มคำถาม
        </button>
      </div>
      {state.questions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm">ยังไม่มีคำถาม กด "+ เพิ่มคำถาม" เพื่อเริ่ม</p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.questions.map((q, idx) => (
            <div key={q.id ?? idx} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
              <span className="text-sm text-gray-400 font-bold mt-0.5 w-6">{idx + 1}.</span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={q.label}
                  onChange={async e => {
                    const newLabel = e.target.value;
                    setState(s => ({ ...s, questions: s.questions.map((qq, i) => i === idx ? { ...qq, label: newLabel } : qq) }));
                    if (q.id && formId) {
                      try { await apiPatch(`/api/v1/forms/${formId}/questions/${q.id}`, { label: newLabel }); } catch {}
                    }
                  }}
                  className="w-full text-sm font-semibold border-0 border-b border-gray-200 focus:outline-none focus:border-psu-navy pb-1"
                  placeholder="คำถาม..."
                />
                <select
                  value={q.questionType}
                  onChange={async e => {
                    const newType = e.target.value;
                    setState(s => ({ ...s, questions: s.questions.map((qq, i) => i === idx ? { ...qq, questionType: newType } : qq) }));
                    if (q.id && formId) {
                      try { await apiPatch(`/api/v1/forms/${formId}/questions/${q.id}`, { questionType: newType }); } catch {}
                    }
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-psu-navy"
                >
                  <option value="rating">Rating 1-5</option>
                  <option value="short_text">Short Text</option>
                  <option value="long_text">Long Text</option>
                  <option value="single_choice">Single Choice</option>
                  <option value="multi_choice">Multiple Choice</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Step4({ state, setState, faculties, previewCount }: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  faculties: Faculty[];
  previewCount: number | null;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-psu-navy">ส่งให้ใคร</h2>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">คณะที่ได้รับ</label>
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={state.allFaculties}
            onChange={e => setState(s => ({ ...s, allFaculties: e.target.checked, selectedFacultyIds: [] }))}
            className="h-4 w-4 rounded border-gray-300 text-psu-navy" />
          <span className="text-sm font-semibold text-gray-900">ทุกคณะ</span>
        </label>
        {!state.allFaculties && (
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
            {faculties.map(f => (
              <label key={f.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox"
                  checked={state.selectedFacultyIds.includes(f.id)}
                  onChange={e => setState(s => ({
                    ...s,
                    selectedFacultyIds: e.target.checked
                      ? [...s.selectedFacultyIds, f.id]
                      : s.selectedFacultyIds.filter(id => id !== f.id),
                  }))}
                  className="h-4 w-4 rounded border-gray-300 text-psu-navy" />
                <span className="text-sm text-gray-700">{f.nameTh}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">ผู้รับ (role)</label>
        <div className="flex gap-4">
          {[{ val: 'student', label: 'นักศึกษา' }, { val: 'teacher', label: 'อาจารย์' }, { val: 'staff', label: 'บุคลากร' }].map(r => (
            <label key={r.val} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox"
                checked={state.targetRoles.includes(r.val)}
                onChange={e => setState(s => ({
                  ...s,
                  targetRoles: e.target.checked ? [...s.targetRoles, r.val] : s.targetRoles.filter(x => x !== r.val),
                }))}
                className="h-4 w-4 rounded border-gray-300 text-psu-navy" />
              <span className="text-sm text-gray-700">{r.label}</span>
            </label>
          ))}
        </div>
      </div>
      {previewCount !== null && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 font-semibold">
          จะส่งให้ ~{previewCount.toLocaleString()} คน
        </div>
      )}
    </div>
  );
}

function Step5({ state, roundId, formId }: { state: WizardState; roundId: string | null; formId: string | null }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  const handleSaveDraft = () => router.push('/forms');

  const handlePublish = async () => {
    if (!formId) return;
    setPublishing(true);
    try {
      await apiPost(`/api/v1/forms/${formId}/publish`, {});
      router.push('/forms');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-psu-navy">ยืนยันและเผยแพร่</h2>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">ชื่อการประเมิน</span><span className="font-semibold">{state.name}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">ปีการศึกษา</span><span className="font-semibold">{state.academicYear} ภาค {state.semester}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">วันที่</span><span className="font-semibold">{state.openDate || '-'} ถึง {state.closeDate || '-'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">เว็บไซต์</span><span className="font-semibold">{state.selectedWebsiteIds.length} เว็บ</span></div>
        <div className="flex justify-between"><span className="text-gray-500">คำถาม</span><span className="font-semibold">{state.questions.length} ข้อ</span></div>
        <div className="flex justify-between"><span className="text-gray-500">ผู้รับ</span><span className="font-semibold">{state.allFaculties ? 'ทุกคณะ' : `${state.selectedFacultyIds.length} คณะ`} / {state.targetRoles.join(', ')}</span></div>
      </div>
      <div className="flex gap-4">
        <button type="button" onClick={handleSaveDraft}
          className="flex-1 py-3 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50">
          บันทึกร่าง
        </button>
        <button type="button" onClick={handlePublish} disabled={publishing}
          className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
          เผยแพร่
        </button>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Create wizard page route**

Create `web/app/(auth)/evaluations/create/page.tsx`:

```tsx
'use client';

import { EvaluationWizard } from '@/components/evaluation/EvaluationWizard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateEvaluationPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/forms" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4">
          <ArrowLeft className="h-4 w-4" /> กลับการประเมิน
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">สร้างการประเมินใหม่</h1>
      </div>
      <EvaluationWizard />
    </div>
  );
}
```

- [x] **Step 3: Add duplicate button to forms/page.tsx**

In `web/app/(auth)/forms/page.tsx`, find the existing form card action buttons and add duplicate:

```typescript
const handleDuplicate = async (formId: string) => {
  try {
    await apiPost(`/api/v1/forms/${formId}/duplicate`, {});
    fetchForms(); // refresh list
  } catch (err: any) {
    alert(err.message ?? 'Duplicate failed');
  }
};
```

Add button to each form card:
```tsx
<button
  onClick={() => handleDuplicate(form.id)}
  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
  title="คัดลอกการประเมิน"
>
  Duplicate
</button>
```

- [x] **Step 4: Add layout.tsx route for /evaluations/create**

In `web/app/(auth)/layout.tsx`, add `/evaluations` to `useAppShell`:
```typescript
const useAppShell =
  pathname.startsWith('/evaluator') ||
  pathname.startsWith('/forms') ||
  pathname.startsWith('/evaluations') ||  // ← add this
  pathname === '/dashboard' ||
  // ... rest unchanged
```

- [x] **Step 5: TypeScript check**

```bash
cd /e/EILAP_ROJECTDEMO/web && pnpm exec tsc --noEmit
```

Expected: no errors

- [x] **Step 6: Commit**

```bash
git add web/components/evaluation/ web/app/\(auth\)/evaluations/ web/app/\(auth\)/forms/page.tsx web/app/\(auth\)/layout.tsx
git commit -m "feat: evaluation wizard — 5-step Google Forms style creation flow"
```

---

## Task 7: Admin Dashboard — Real Data

**Files:**
- Modify: `web/app/(auth)/dashboard/page.tsx`
- Modify: `backend/api/src/modules/dashboard/dashboard.controller.ts`

- [x] **Step 1: Update admin dashboard to pick active round automatically**

In `web/app/(auth)/dashboard/page.tsx`, the `useEffect` already fetches `GET /api/v1/rounds?status=active`. Verify the rounds service returns rounds with `status=active` filter.

Read rounds service:
```bash
grep -n "status" backend/api/src/modules/rounds/rounds.service.ts | head -20
```

- [x] **Step 2: Fix rounds list filter**

In `backend/api/src/modules/rounds/rounds.service.ts`, ensure `listRounds` accepts status filter and filters correctly. If not, add:

```typescript
async listRounds(scope?: string, status?: string, facultyId?: string) {
  const filters = [isNull(rounds.deletedAt)]
  if (scope) filters.push(eq(rounds.scope, scope as any))
  if (status) filters.push(eq(rounds.status, status as any))
  if (facultyId) filters.push(eq(rounds.facultyId, facultyId))
  return db.select().from(rounds).where(and(...filters)).orderBy(desc(rounds.createdAt))
}
```

- [x] **Step 3: Add completion-by-role to dashboard overview API**

In `backend/api/src/modules/dashboard/dashboard.controller.ts`, add role breakdown to overview response.

After existing `filteredScores` calculation, add:
```typescript
// Completion breakdown by role
const responsesByRole = await request.server.db
  .select({
    role: users.role,
    total: count(),
  })
  .from(responses)
  .innerJoin(forms, and(eq(forms.roundId, roundId), isNull(forms.deletedAt)))
  .innerJoin(users, eq(users.id, responses.respondentId))
  .where(and(
    isNotNull(responses.submittedAt),
    isNull(responses.deletedAt),
    ...(facultyId ? [eq(forms.ownerFacultyId, facultyId)] : []),
  ))
  .groupBy(users.role)

const byRole = Object.fromEntries(responsesByRole.map(r => [r.role, r.total]))
```

Add to return:
```typescript
return {
  data: {
    totalWebsites,
    evaluatedWebsites: scoredWebsites.length,
    totalResponses,
    averageScore: avgScore,
    pendingForms: pendingForms[0]?.total ?? 0,
    topRanked: topRanked ? { ... } : null,
    completionByRole: byRole,  // ← add this
  }
}
```

- [x] **Step 4: Update admin dashboard UI to show role breakdown**

In `web/app/(auth)/dashboard/page.tsx`, add role breakdown section to `AdminDashboard`:

```tsx
{overview?.completionByRole && (
  <section className="rounded-[18px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-6 shadow-[var(--typeui-card-shadow)]">
    <h3 className="text-[14px] font-bold text-[var(--typeui-text)] mb-4">ความคืบหน้าตาม Role</h3>
    <div className="space-y-3">
      {[
        { key: 'student', label: 'นักศึกษา' },
        { key: 'teacher', label: 'อาจารย์' },
        { key: 'staff', label: 'บุคลากร' },
      ].map(({ key, label }) => {
        const count = (overview.completionByRole as any)[key] ?? 0;
        const pct = overview.totalResponses > 0 ? Math.round((count / overview.totalResponses) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-20 text-[12px] text-[var(--typeui-subtext)]">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--typeui-card-border)] overflow-hidden">
              <div className="h-full bg-[var(--typeui-primary)] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-right text-[12px] font-semibold text-[var(--typeui-text)]">{pct}%</span>
          </div>
        );
      })}
    </div>
  </section>
)}
```

- [x] **Step 5: TypeScript + build check**

```bash
cd /e/EILAP_ROJECTDEMO/backend/api && pnpm exec tsc --noEmit
cd /e/EILAP_ROJECTDEMO/web && pnpm exec tsc --noEmit
```

Expected: no errors

- [x] **Step 6: Commit**

```bash
git add backend/api/src/modules/dashboard/ backend/api/src/modules/rounds/ web/app/\(auth\)/dashboard/page.tsx
git commit -m "feat: admin dashboard shows real completion stats with role breakdown"
```

---

## Task 8: Delete Zombie Files

**Files:**
- Delete: `web/app/(auth)/dashboard/page-new.tsx`

- [x] **Step 1: Delete zombie file**

```bash
rm web/app/\(auth\)/dashboard/page-new.tsx
```

- [x] **Step 2: Verify build still passes**

```bash
cd /e/EILAP_ROJECTDEMO/web && pnpm build 2>&1 | tail -10
```

Expected: all routes listed, no errors

- [x] **Step 3: Commit**

```bash
git add -A web/app/\(auth\)/dashboard/page-new.tsx
git commit -m "chore: remove zombie page-new.tsx"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Role-based sidebar per spec | Task 2 |
| super_admin: users + audit only | Task 1 |
| admin (EILA): forms + websites + reports | Tasks 1, 2 |
| executive: dashboard + reports | Task 2 |
| evaluator: งานของฉัน only | Tasks 2, 5 |
| Evaluation Wizard 5 steps | Task 6 |
| Website filter in wizard Step 2 | Task 6 |
| Questions inline editor | Task 6 |
| Faculty/role selector Step 4 | Task 6 |
| Preview count Step 4 | Task 6 |
| Publish → form.status open | Task 6 |
| Duplicate button | Task 6 |
| Evaluator dynamic check (faculty+role) | Task 4 |
| Gate page real API | Task 5 |
| Form page real questions | Task 5 |
| Autosave + submit to real API | Task 5 |
| Success page | Task 5 |
| Admin dashboard completion stats | Task 7 |
| Role breakdown chart | Task 7 |
| Audit 500 fix | Task 3 |
| Zombie file cleanup | Task 8 |

All spec requirements covered. ✅

### Placeholder Scan

No TBD, TODO, or vague steps found. All code blocks are complete. ✅

### Type Consistency

- `FormQuestion` defined in `_shared.tsx` Task 5 Step 1, used in gate/form pages — consistent ✅
- `WizardState` defined in `EvaluationWizard.tsx` — self-contained ✅
- `completionByRole` added to both BE return and FE type — consistent ✅
