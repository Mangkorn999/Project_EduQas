import { z } from 'zod'

export const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  COOKIE_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Notification / SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Scheduler
  DISABLE_SCHEDULER: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

declare module 'fastify' {
  interface FastifyInstance {
    config: Env
  }
}
