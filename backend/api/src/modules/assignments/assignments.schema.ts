import { z } from 'zod'

export const bulkAssignSchema = z.object({
  assignments: z.array(
    z.object({
      userId: z.string().uuid(),
      websiteId: z.string().uuid(),
    }),
  ).min(1),
})
