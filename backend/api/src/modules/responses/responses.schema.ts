import { z } from 'zod'

export const answerSchema = z.object({
  questionId: z.string().uuid(),
  valueNumber: z.number().optional(),
  valueText: z.string().optional(),
  valueJson: z.string().optional(),
})

export const answersBodySchema = z.object({
  answers: z.array(answerSchema),
})
