import { z } from 'zod'

export const roundSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  academicYear: z.number().int(),
  semester: z.number().int(),
  scope: z.enum(['faculty', 'university']),
  status: z.enum(['draft', 'active', 'closed']),
  facultyId: z.string().uuid().nullable(),
})

export const createRoundSchema = z.object({
  name: z.string(),
  academicYear: z.number().int(),
  semester: z.number().int(),
  scope: z.enum(['faculty', 'university']),
  facultyId: z.string().uuid().optional(),
  websiteIds: z.array(z.string().uuid()).optional(),
})

export const updateRoundSchema = z.object({
  name: z.string().optional(),
  academicYear: z.number().int().optional(),
  semester: z.number().int().optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  websiteIds: z.array(z.string().uuid()).optional(),
})
