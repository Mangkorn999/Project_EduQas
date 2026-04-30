import { z } from 'zod'

export const submitPdpaSchema = z.object({
  reason: z.string().optional(),
})

export const rejectPdpaSchema = z.object({
  reason: z.string().min(1),
})
