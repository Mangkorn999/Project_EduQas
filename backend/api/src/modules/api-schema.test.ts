import { describe, expect, it } from 'vitest'
import { overviewQuerySchema, scorecardParamsSchema, trendQuerySchema } from './dashboard/dashboard.schema'
import { rankingQuerySchema } from './ranking/ranking.schema'
import { formIdParamsSchema, listFormsQuerySchema } from './forms/forms.schema'
import { formIdParamsSchema as responseFormIdParamsSchema, responseIdParamsSchema } from './responses/responses.schema'

const uuid = '00000000-0000-4000-8000-000000000000'

describe('API route schemas', () => {
  it('validates dashboard query and params UUIDs', () => {
    expect(overviewQuerySchema.safeParse({ roundId: uuid }).success).toBe(true)
    expect(overviewQuerySchema.safeParse({ roundId: 'bad-id' }).success).toBe(false)
    expect(scorecardParamsSchema.safeParse({ id: uuid }).success).toBe(true)
    expect(scorecardParamsSchema.safeParse({ id: 'bad-id' }).success).toBe(false)
  })

  it('parses dashboard trend roundIds from comma-separated query input', () => {
    const parsed = trendQuerySchema.parse({ websiteId: uuid, roundIds: `${uuid},${uuid}` })
    expect(parsed.roundIds).toEqual([uuid, uuid])
  })

  it('validates ranking query UUIDs', () => {
    expect(rankingQuerySchema.safeParse({ roundId: uuid, facultyId: uuid }).success).toBe(true)
    expect(rankingQuerySchema.safeParse({ roundId: uuid, facultyId: 'bad-id' }).success).toBe(false)
  })

  it('validates forms params and list filters', () => {
    expect(formIdParamsSchema.safeParse({ id: uuid }).success).toBe(true)
    expect(formIdParamsSchema.safeParse({ id: 'bad-id' }).success).toBe(false)
    expect(listFormsQuerySchema.safeParse({ status: 'open', ownerFacultyId: uuid }).success).toBe(true)
    expect(listFormsQuerySchema.safeParse({ status: 'archived' }).success).toBe(false)
  })

  it('validates response route params', () => {
    expect(responseFormIdParamsSchema.safeParse({ formId: uuid }).success).toBe(true)
    expect(responseIdParamsSchema.safeParse({ responseId: uuid }).success).toBe(true)
    expect(responseIdParamsSchema.safeParse({ responseId: 'bad-id' }).success).toBe(false)
  })
})
