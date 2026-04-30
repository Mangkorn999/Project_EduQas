import { z } from 'zod'

export const websiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  category: z.string().optional(),
  ownerFacultyId: z.string().uuid().optional(),
  urlStatus: z.enum(['up', 'down', 'unknown']).default('unknown'),
})

export const createWebsiteSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  category: z.string().optional(),
  ownerFacultyId: z.string().uuid().optional(),
})

export const updateWebsiteSchema = z.object({
  name: z.string().optional(),
  url: z.string().url().optional(),
  category: z.string().optional(),
})
