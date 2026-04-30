import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().uuid(),
  psuPassportId: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.string(),
  facultyId: z.string().uuid().nullable(),
})

export const createUserSchema = z.object({
  psuPassportId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'executive', 'super_admin', 'teacher', 'staff', 'student']),
  facultyId: z.string().uuid(),
  displayName: z.string().min(1),
})

export const updateUserSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student']).optional(),
  facultyId: z.string().uuid().optional(),
  displayName: z.string().min(1).optional(),
})
