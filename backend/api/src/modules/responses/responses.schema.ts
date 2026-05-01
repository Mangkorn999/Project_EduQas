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

export const formIdParamsSchema = z.object({
  formId: z.string().uuid(),
})

export const responseIdParamsSchema = z.object({
  responseId: z.string().uuid(),
})
