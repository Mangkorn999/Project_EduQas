import crypto from 'crypto'
import { db } from '../../../../db'
import { pdpaRequests, users } from '../../../../db/schema'
import { eq, and, or, count } from 'drizzle-orm'

export async function submitPdpaRequest(userId: string, reason?: string) {
  const [existing] = await db
    .select()
    .from(pdpaRequests)
    .where(
      and(
        eq(pdpaRequests.userId, userId),
        or(eq(pdpaRequests.status, 'pending'), eq(pdpaRequests.status, 'approved')),
      ),
    )

  if (existing) {
    throw new Error('pending_request_exists')
  }

  const [request] = await db
    .insert(pdpaRequests)
    .values({ userId, reason, status: 'pending' })
    .returning()

  return request
}

export async function listPdpaRequests(page: number, limit: number) {
  const offset = (page - 1) * limit

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(pdpaRequests)
      .orderBy(pdpaRequests.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(pdpaRequests),
  ])

  return {
    data: rows,
    meta: {
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    },
  }
}

export async function approvePdpaRequest(requestId: string, reviewedById: string) {
  const [request] = await db
    .select()
    .from(pdpaRequests)
    .where(eq(pdpaRequests.id, requestId))

  if (!request) throw new Error('not_found')
  if (request.status !== 'pending') throw new Error('invalid_status')

  await db
    .update(pdpaRequests)
    .set({ status: 'approved', reviewedById, reviewedAt: new Date() })
    .where(eq(pdpaRequests.id, requestId))

  const anonId = `anon:${crypto.randomBytes(8).toString('hex')}`

  await db
    .update(users)
    .set({
      psuPassportId: anonId,
      email: 'anonymized@deleted.invalid',
      displayName: 'ผู้ใช้ไม่ระบุชื่อ',
    })
    .where(eq(users.id, request.userId))

  const [completed] = await db
    .update(pdpaRequests)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(pdpaRequests.id, requestId))
    .returning()

  return completed
}

export async function rejectPdpaRequest(requestId: string, reviewedById: string, reason: string) {
  const [request] = await db
    .select()
    .from(pdpaRequests)
    .where(eq(pdpaRequests.id, requestId))

  if (!request) throw new Error('not_found')
  if (request.status !== 'pending') throw new Error('invalid_status')

  const [updated] = await db
    .update(pdpaRequests)
    .set({ status: 'rejected', reviewedById, reviewedAt: new Date(), reason })
    .where(eq(pdpaRequests.id, requestId))
    .returning()

  return updated
}

export async function purgePdpaData(requestId: string, adminId: string) {
  const [request] = await db
    .select()
    .from(pdpaRequests)
    .where(eq(pdpaRequests.id, requestId))

  if (!request) throw new Error('not_found')
  // We'll allow it from approved or completed status.
  if (request.status !== 'completed' && request.status !== 'approved') {
    throw new Error('invalid_status_for_purge')
  }

  // Set deletedAt for the user to hard-remove them from active queries
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
    })
    .where(eq(users.id, request.userId))

  // Mark request as purged
  const [updated] = await db
    .update(pdpaRequests)
    .set({ status: 'completed', completedAt: new Date() }) 
    .where(eq(pdpaRequests.id, requestId))
    .returning()

  return updated
}
