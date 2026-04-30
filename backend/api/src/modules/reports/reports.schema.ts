import { z } from 'zod'

export const exportResponsesSchema = z.object({
  formId: z.string().uuid(),
})
