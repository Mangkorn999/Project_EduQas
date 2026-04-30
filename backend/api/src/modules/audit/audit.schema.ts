import { z } from 'zod'
import { paginationSchema } from '../../utils/pagination'

export const listAuditQuerySchema = paginationSchema.extend({
  userId: z.string().optional(),
  entityType: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const verifyAuditQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})
