import { z } from 'zod'

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string(),
    role: z.string(),
    facultyId: z.string().nullable(),
  }),
})

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
})

export const setRoleSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student']),
})

export const roleOverrideOTPSchema = z.object({
  userId: z.string(),
  overrideRole: z.enum(['admin', 'executive', 'super_admin', 'teacher', 'staff', 'student']),
})

export const roleOverrideVerifySchema = z.object({
  userId: z.string(),
  otp: z.string(),
  overrideRole: z.enum(['admin', 'executive', 'super_admin', 'teacher', 'staff', 'student']),
  reason: z.string().optional(),
})
