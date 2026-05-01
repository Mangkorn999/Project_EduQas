import { z } from 'zod'

export const facultySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameTh: z.string(),
  nameEn: z.string(),
})

export const createFacultySchema = z.object({
  code: z.string().min(1),
  nameTh: z.string().min(1),
  nameEn: z.string().min(1),
})

export const updateFacultySchema = z.object({
  code: z.string().min(1).optional(),
  nameTh: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
})
