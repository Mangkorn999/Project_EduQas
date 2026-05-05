import { z } from 'zod'

export const bulkAssignSchema = z.object({
  assignments: z.array(
    z.object({
      userId: z.string().uuid(),
      websiteId: z.string().uuid(),
    }),
  ).min(1),
})

const EVALUATOR_ROLES = ['teacher', 'staff', 'student'] as const

export const bulkAssignByRoleSchema = z.object({
  roundId: z.string().uuid(),
  websiteId: z.string().uuid(),
  roles: z.array(z.enum(EVALUATOR_ROLES)).min(1, 'ต้องเลือกอย่างน้อย 1 กลุ่ม'),
  facultyId: z.union([z.string().uuid(), z.literal('all')]),
})

export const previewCountQuerySchema = z.object({
  roles: z.string().min(1), // comma-separated e.g. "teacher,staff"
  facultyId: z.union([z.string().uuid(), z.literal('all')]),
})
