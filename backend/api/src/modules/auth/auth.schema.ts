import { z } from 'zod'

export const facultyResponseSchema = z.object({
  id: z.string().uuid().nullable(),
  code: z.string().nullable(),
  nameTh: z.string().nullable(),
  nameEn: z.string().nullable(),
  source: z.string().nullable(),
})

export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  role: z.string(),
  facultyId: z.string().nullable(),
  facultyNameTh: z.string().nullable(),
  facultyNameEn: z.string().nullable(),
  faculty: facultyResponseSchema.nullable(),
})

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: meResponseSchema,
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
