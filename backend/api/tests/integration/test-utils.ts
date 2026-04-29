import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })
import { db } from '../../../db'
import { users, faculties, forms, rounds, websites, responses, pdpaRequests, auditLog } from '../../../db/schema'
import crypto from 'crypto'
import { eq, inArray } from 'drizzle-orm'

export const generateId = () => crypto.randomUUID()

export async function clearTestData(ids: {
  userIds?: string[],
  facultyIds?: string[],
  roundIds?: string[],
  websiteIds?: string[],
  formIds?: string[],
  responseIds?: string[],
  pdpaIds?: string[],
  auditIds?: (string | bigint)[]
}) {
  if (ids.auditIds?.length) await db.delete(auditLog).where(inArray(auditLog.id, ids.auditIds.filter(Boolean).map(BigInt)))
  if (ids.pdpaIds?.length) await db.delete(pdpaRequests).where(inArray(pdpaRequests.id, ids.pdpaIds.filter(Boolean)))
  if (ids.responseIds?.length) await db.delete(responses).where(inArray(responses.id, ids.responseIds.filter(Boolean)))
  if (ids.formIds?.length) await db.delete(forms).where(inArray(forms.id, ids.formIds.filter(Boolean)))
  if (ids.roundIds?.length) await db.delete(rounds).where(inArray(rounds.id, ids.roundIds.filter(Boolean)))
  if (ids.websiteIds?.length) await db.delete(websites).where(inArray(websites.id, ids.websiteIds.filter(Boolean)))
  if (ids.userIds?.length) await db.delete(users).where(inArray(users.id, ids.userIds.filter(Boolean)))
  if (ids.facultyIds?.length) await db.delete(faculties).where(inArray(faculties.id, ids.facultyIds.filter(Boolean)))
}
