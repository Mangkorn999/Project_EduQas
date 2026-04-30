import { z } from 'zod'

export const templateSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  scope: z.enum(['faculty', 'global']),
  ownerFacultyId: z.string().uuid().nullable(),
  isDeprecated: z.boolean().default(false),
})

export const createTemplateSchema = z.object({
  title: z.string().min(1),
  scope: z.enum(['faculty', 'global']),
  ownerFacultyId: z.string().uuid().optional(),
})

export const updateTemplateSchema = z.object({
  title: z.string().min(1).optional(),
  scope: z.enum(['faculty', 'global']).optional(),
})

export const cloneTemplateSchema = z.object({
  targetFacultyId: z.string().uuid().optional(),
})
