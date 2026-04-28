import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationParams = z.infer<typeof paginationSchema>

export function getPaginationOffset(page: number, limit: number) {
  return (page - 1) * limit
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return { data, total, page, limit }
}
