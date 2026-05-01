import { z } from 'zod'

export const rankingQuerySchema = z.object({
  roundId: z.string().uuid(),
  facultyId: z.string().uuid().optional(),
  category: z.string().optional(),
})

export const mostImprovedQuerySchema = z.object({
  currentRoundId: z.string().uuid(),
  previousRoundId: z.string().uuid(),
  facultyId: z.string().uuid().optional(),
})

export const heatmapQuerySchema = z.object({
  roundId: z.string().uuid(),
})
