import { z } from 'zod'

export const formIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const criterionParamsSchema = z.object({
  id: z.string().uuid(),
  cid: z.string().uuid(),
})

export const questionParamsSchema = z.object({
  id: z.string().uuid(),
  qid: z.string().uuid(),
})

export const versionParamsSchema = z.object({
  id: z.string().uuid(),
  vid: z.string().uuid(),
})

export const templateParamsSchema = z.object({
  templateId: z.string().uuid(),
})

export const listFormsQuerySchema = z.object({
  roundId: z.string().uuid().optional(),
  status: z.enum(['draft', 'open', 'closed']).optional(),
  ownerFacultyId: z.string().uuid().optional(),
})

export const formSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  roundId: z.string().uuid(),
  scope: z.enum(['faculty', 'university']),
  status: z.enum(['draft', 'open', 'closed']),
  ownerFacultyId: z.string().uuid().optional(),
  websiteTargetId: z.string().uuid().optional(),
})

export const createFormSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  roundId: z.string().uuid(),
  scope: z.enum(['faculty', 'university']),
  ownerFacultyId: z.string().uuid().optional(),
  websiteTargetId: z.string().uuid().optional(),
})

export const updateFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'open', 'closed']).optional(),
  websiteTargetId: z.string().uuid().optional(),
})

export const criterionSchema = z.object({
  name: z.string(),
  dimension: z.string().optional(),
  weight: z.number().int().min(1),
})

export const questionSchema = z.object({
  questionType: z.enum(['short_text', 'long_text', 'single_choice', 'multi_choice', 'rating', 'scale_5', 'scale_10', 'boolean', 'date', 'number']),
  label: z.string(),
  criterionId: z.string().uuid().optional(),
  helpText: z.string().optional(),
  isRequired: z.boolean().optional(),
  config: z.any().optional(),
  sortOrder: z.number().int().optional(),
})

export const reorderQuestionsSchema = z.array(z.object({
  id: z.string().uuid(),
  sortOrder: z.number().int(),
}))

export const importFormSchema = z.object({
  form: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    scope: z.enum(['faculty', 'university']),
  }),
  criteria: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    dimension: z.string().optional(),
    weight: z.number().int().min(1).optional(),
  })).optional().default([]),
  questions: z.array(z.object({
    questionType: z.enum(['short_text', 'long_text', 'single_choice', 'multi_choice', 'rating', 'scale_5', 'scale_10', 'boolean', 'date', 'number']),
    label: z.string().min(1),
    criterionId: z.string().optional(),
    helpText: z.string().optional(),
    isRequired: z.boolean().optional(),
    config: z.any().optional(),
    sortOrder: z.number().int().optional(),
  })).optional().default([]),
})

export const createFromTemplateSchema = z.object({
  title: z.string().min(1),
  roundId: z.string().uuid().optional(),
  websiteUrl: z.string().url().optional(),
  websiteName: z.string().optional(),
  scope: z.enum(['faculty', 'university']),
  ownerFacultyId: z.string().uuid().optional(),
})
