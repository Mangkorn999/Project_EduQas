import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import path from 'path'
import dotenv from 'dotenv'

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') })
}

const client = postgres(process.env.DATABASE_URL!)

export const db = drizzle(client, { schema })
