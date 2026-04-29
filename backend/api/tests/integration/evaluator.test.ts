import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { ResponsesService } from '../../src/modules/responses/responses.service'
import { generateId, clearTestData } from './test-utils'
import { db } from '../../../db'
import { users, faculties, forms, rounds, websites, responses, formQuestions } from '../../../db/schema'
import { eq, inArray } from 'drizzle-orm'

describe('Evaluator Flow Integration', () => {
  const service = new ResponsesService()
  
  const ctx = {
    facultyId: generateId(),
    userId: generateId(),
    roundId: generateId(),
    formId: generateId(),
  }

  beforeAll(async () => {
    // Setup Faculty
    await db.insert(faculties).values({
      id: ctx.facultyId,
      code: `TEST-FAC-${ctx.facultyId.slice(0, 4)}`,
      nameTh: 'คณะทดสอบ',
      nameEn: 'Test Faculty',
    })
    
    // Setup User
    await db.insert(users).values({
      id: ctx.userId,
      psuPassportId: `test.evaluator.${ctx.userId.slice(0, 4)}`,
      email: 'evaluator@test.com',
      displayName: 'Test Evaluator',
      role: 'teacher',
      facultyId: ctx.facultyId,
    })

    // Setup Round
    await db.insert(rounds).values({
      id: ctx.roundId,
      name: 'Test Round',
      academicYear: 2026,
      semester: 1,
      scope: 'university',
      status: 'active', // Active initially
      createdById: ctx.userId,
    })

    // Setup Form
    await db.insert(forms).values({
      id: ctx.formId,
      roundId: ctx.roundId,
      title: 'Test Form',
      status: 'open', // Form is open
      scope: 'university',
      createdById: ctx.userId,
    })

    // Setup Question
    await db.insert(formQuestions).values({
      id: generateId(),
      formId: ctx.formId,
      questionType: 'short_text',
      label: 'Question 1',
      sortOrder: 1,
      config: {}
    })
  })

  afterAll(async () => {
    // 1. Clean responses first (they have FK to forms)
    await db.delete(responses).where(eq(responses.formId, ctx.formId))

    // 2. Clean everything else
    await clearTestData({
      userIds: [ctx.userId],
      formIds: [ctx.formId],
      roundIds: [ctx.roundId],
      facultyIds: [ctx.facultyId],
    })
  })

  it('Submit without website_opened -> 422', async () => {
    // Attempt to upsert without logging website open first
    try {
      await service.upsertResponse(ctx.formId, ctx.userId, [])
      expect.fail('Should have thrown an error')
    } catch (err: any) {
      expect(err.statusCode).toBe(422)
      expect(err.code).toBe('website_not_opened')
    }
  })

  it('Log website_opened, Save draft, then Submit', async () => {
    // 0. Fetch a real question ID from the form questions
    const [question] = await db.select().from(formQuestions).where(eq(formQuestions.formId, ctx.formId)).limit(1)
    const qId = question?.id ?? generateId()

    // 1. Log website open
    await service.logWebsiteOpen(ctx.formId, ctx.userId)

    // 2. Save draft (answers empty or partial)
    const draftRes = await service.upsertResponse(ctx.formId, ctx.userId, [
      { questionId: qId, valueText: 'Draft Answer' }
    ])
    expect(draftRes.id).toBeDefined()

    // 3. Update Response (Submit)
    const submitRes = await service.updateResponse(draftRes.id, ctx.userId, [
      { questionId: qId, valueText: 'Final Answer' }
    ])
    expect(submitRes.id).toBe(draftRes.id)
  })

  it('Submit after round closed -> 409', async () => {
    // Close the form
    await db.update(forms).set({ status: 'closed' }).where(eq(forms.id, ctx.formId))

    try {
      await service.upsertResponse(ctx.formId, ctx.userId, [])
      expect.fail('Should have thrown an error')
    } catch (err: any) {
      expect(err.statusCode).toBe(409)
      expect(err.code).toBe('form_not_open')
    }
  })
})
