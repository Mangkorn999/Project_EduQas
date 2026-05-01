import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'drizzle-kit'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const toPosix = (value: string) => value.replace(/\\/g, '/')

export default defineConfig({
  schema: toPosix(path.join(configDir, 'backend/db/schema/*.ts')),
  out: './backend/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
