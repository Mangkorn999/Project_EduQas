import crypto from 'node:crypto'
import { db } from '../../../../db'
import { auditLog } from '../../../../db/schema/audit'
import { and, asc, desc, gte, lte, eq, sql, type SQL } from 'drizzle-orm'
import { getPaginationOffset, paginatedResponse } from '../../utils/pagination'

function computeHash(
  prevHash: string,
  rowId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
  ip: string,
  isoTimestamp: string,
): string {
  return crypto
    .createHash('sha256')
    .update(
      [
        prevHash,
        rowId,
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(oldValue ?? ''),
        JSON.stringify(newValue ?? ''),
        ip,
        isoTimestamp,
      ].join('|'),
    )
    .digest('hex')
}

export async function createAuditLog(
  ctx: { userId?: string; ip?: string },
  action: string,
  entityType: string,
  entityId?: string,
  oldValue?: unknown,
  newValue?: unknown,
): Promise<void> {
  try {
    const lastRow = await db
      .select({ hash: auditLog.hash })
      .from(auditLog)
      .orderBy(desc(auditLog.id))
      .limit(1)

    const prevHash =
      lastRow.length > 0
        ? lastRow[0].hash
        : `genesis:${process.env.NODE_ENV ?? 'dev'}`

    const newId = crypto.randomUUID()
    const userId = ctx.userId ?? ''
    const ip = ctx.ip ?? ''
    const now = new Date().toISOString()

    const hash = computeHash(
      prevHash,
      newId,
      userId,
      action,
      entityType,
      entityId ?? '',
      oldValue,
      newValue,
      ip,
      now,
    )

    await db.insert(auditLog).values({
      uuid: newId,
      userId: ctx.userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      oldValue: (oldValue ?? null) as object | null,
      newValue: (newValue ?? null) as object | null,
      ip: ctx.ip ?? null,
      prevHash,
      hash,
    })
  } catch (err) {
    process.stderr.write(`[audit] createAuditLog error: ${String(err)}\n`)
  }
}

export async function listAuditLog(
  filters: { userId?: string; entityType?: string; from?: string; to?: string },
  page: number,
  limit: number,
) {
  const conditions: SQL<unknown>[] = []

  if (filters.userId) {
    conditions.push(eq(auditLog.userId, filters.userId))
  }
  if (filters.entityType) {
    conditions.push(eq(auditLog.entityType, filters.entityType))
  }
  if (filters.from) {
    conditions.push(gte(auditLog.createdAt, new Date(filters.from)))
  }
  if (filters.to) {
    conditions.push(lte(auditLog.createdAt, new Date(filters.to)))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.id))
      .limit(limit)
      .offset(getPaginationOffset(page, limit)),
    db
      .select({ count: sql<string>`count(*)` })
      .from(auditLog)
      .where(where),
  ])

  const total = Number(countResult[0]?.count ?? 0)
  return paginatedResponse(rows, total, page, limit)
}

export async function verifyAuditChain(
  from?: bigint,
  to?: bigint,
): Promise<{
  status: 'pass' | 'fail'
  count: number
  failedAt?: bigint
  windowStart?: bigint
  windowEnd?: bigint
}> {
  const conditions: SQL<unknown>[] = []
  if (from !== undefined) {
    conditions.push(gte(auditLog.id, from))
  }
  if (to !== undefined) {
    conditions.push(lte(auditLog.id, to))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(asc(auditLog.id))

  if (rows.length === 0) {
    return { status: 'pass', count: 0 }
  }

  const windowStart = rows[0].id as bigint
  const windowEnd = rows[rows.length - 1].id as bigint

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    if (i > 0) {
      const prevRow = rows[i - 1]
      if (row.prevHash !== prevRow.hash) {
        return {
          status: 'fail',
          count: i,
          failedAt: row.id as bigint,
          windowStart,
          windowEnd,
        }
      }
    }

    const recomputed = computeHash(
      row.prevHash,
      row.uuid,
      row.userId ?? '',
      row.action,
      row.entityType,
      row.entityId ?? '',
      row.oldValue,
      row.newValue,
      row.ip ?? '',
      row.createdAt.toISOString(),
    )

    if (recomputed !== row.hash) {
      return {
        status: 'fail',
        count: i,
        failedAt: row.id as bigint,
        windowStart,
        windowEnd,
      }
    }
  }

  return { status: 'pass', count: rows.length, windowStart, windowEnd }
}
