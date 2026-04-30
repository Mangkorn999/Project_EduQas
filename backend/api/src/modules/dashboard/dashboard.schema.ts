import { z } from 'zod'

export const overviewQuerySchema = z.object({
  roundId: z.string().uuid(),
  facultyId: z.string().uuid().optional(),
})

export const scorecardQuerySchema = z.object({
  roundId: z.string().uuid(),
})

export const scorecardParamsSchema = z.object({
  id: z.string().uuid(),
})

export const trendQuerySchema = z.object({
  websiteId: z.string().uuid(),
  roundIds: z.string().transform(s => s.split(',')),
})
