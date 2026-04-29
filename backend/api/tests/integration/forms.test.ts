import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FormsService } from '../../src/modules/forms/forms.service'
import { SnapshotService } from '../../src/modules/forms/snapshot.service'
import { generateId, clearTestData } from './test-utils'
import { db } from '../../../db'
import { users, forms, formQuestions, formVersions, faculties } from '../../../db/schema'
import { eq } from 'drizzle-orm'

describe('Forms Versioning Integration', () => {
  const formService = new FormsService()
  const snapshotService = new SnapshotService()
  
  const ctx = {
    userId: generateId(),
    formId: generateId(),
  }

  beforeAll(async () => {
    // Setup Faculty first because users table has a required facultyId FK
    const facultyId = generateId()
    await db.insert(faculties).values({
      id: facultyId,
      code: `FORMS-FAC-${facultyId.slice(0, 4)}`,
      nameTh: 'คณะฟอร์ม',
      nameEn: 'Forms Faculty',
    })

    await db.insert(users).values({
      id: ctx.userId,
      psuPassportId: `test.forms.${ctx.userId.slice(0, 4)}`,
      email: 'forms@test.com',
      displayName: 'Test Forms Admin',
      role: 'super_admin',
      facultyId: facultyId,
    })

    await db.insert(forms).values({
      id: ctx.formId,
      title: 'V1 Form',
      status: 'draft',
      scope: 'university',
      createdById: ctx.userId,
    })

    await db.insert(formQuestions).values([
      { id: generateId(), formId: ctx.formId, questionType: 'short_text', label: 'Field 1', sortOrder: 1, config: {} },
      { id: generateId(), formId: ctx.formId, questionType: 'rating', label: 'Field 2', sortOrder: 2, config: {} },
    ])
  })

  afterAll(async () => {
    await clearTestData({
      userIds: [ctx.userId],
      formIds: [ctx.formId],
    })
    // cascade should clean formFields and formVersions
    await db.delete(formQuestions).where(eq(formQuestions.formId, ctx.formId))
    await db.delete(formVersions).where(eq(formVersions.formId, ctx.formId))
  })

  it('Publishing creates a snapshot version', async () => {
    const published = await snapshotService.publishForm(ctx.formId)
    // The snapshot service returns the updated form. We need to query the version manually to assert.
    const [version] = await db.select().from(formVersions).where(eq(formVersions.formId, ctx.formId))
    
    expect(version.versionNumber).toBe(1)
    expect(version.snapshot).toBeDefined()
    
    const parsed = typeof version.snapshot === 'string' ? JSON.parse(version.snapshot) : version.snapshot
    expect(parsed.questions.length).toBe(2)
    expect(parsed.questions[0].label).toBe('Field 1')
  })

  it('Modifying draft and rolling back restores original snapshot', async () => {
    // 1. Modify draft
    await db.insert(formQuestions).values({
      id: generateId(), formId: ctx.formId, questionType: 'number', label: 'Field 3 (Mistake)', sortOrder: 3, config: {}
    })

    let questionsAfterInsert = await db.select().from(formQuestions).where(eq(formQuestions.formId, ctx.formId))
    expect(questionsAfterInsert.length).toBe(3)

    // 2. Rollback to V1
    const [v1] = await db.select().from(formVersions).where(eq(formVersions.formId, ctx.formId))
    await snapshotService.rollbackToVersion(ctx.formId, v1.id)

    // 3. Verify fields (now called formQuestions in snapshot service)
    let questionsAfterRollback = await db.select().from(formQuestions).where(eq(formQuestions.formId, ctx.formId))
    expect(questionsAfterRollback.length).toBe(2)
    expect(questionsAfterRollback.find((f: any) => f.label === 'Field 3 (Mistake)')).toBeUndefined()
  })
})
