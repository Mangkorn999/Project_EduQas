import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAuditLog, verifyAuditChain } from '../../src/modules/audit/audit.service'
import { approvePdpaRequest, submitPdpaRequest, purgePdpaData } from '../../src/modules/pdpa/pdpa.service'
import { generateId, clearTestData } from './test-utils'
import { db } from '../../../db'
import { users, auditLog, pdpaRequests, faculties } from '../../../db/schema'
import { eq } from 'drizzle-orm'

describe('Audit & PDPA Integration', () => {
  const ctx = {
    userId: generateId(),
    adminId: generateId(),
    auditIds: [] as string[],
    pdpaId: '',
  }

  beforeAll(async () => {
    const facultyId = generateId()
    await db.insert(faculties).values({
      id: facultyId,
      code: `AUDIT-FAC-${facultyId.slice(0, 4)}`,
      nameTh: 'คณะตรวจสอบ',
      nameEn: 'Audit Faculty',
    })

    await db.insert(users).values([
      {
        id: ctx.userId,
        psuPassportId: `test.target.${ctx.userId.slice(0, 4)}`,
        email: 'target@test.com',
        displayName: 'Test Target User',
        role: 'teacher',
        facultyId: facultyId,
      },
      {
        id: ctx.adminId,
        psuPassportId: `test.admin.${ctx.adminId.slice(0, 4)}`,
        email: 'admin@test.com',
        displayName: 'Test Admin',
        role: 'super_admin',
        facultyId: facultyId,
      }
    ])
  })

  afterAll(async () => {
    await clearTestData({
      userIds: [ctx.userId, ctx.adminId],
      auditIds: ctx.auditIds,
      pdpaIds: [ctx.pdpaId]
    })
    // Hard clean users if purge tests left them deleted
    await db.delete(users).where(eq(users.id, ctx.userId))
    await db.delete(users).where(eq(users.id, ctx.adminId))
  })

  describe('Audit Chain', () => {
    it('Creates valid audit logs', async () => {
      const log1 = await createAuditLog({ userId: ctx.adminId, ip: '127.0.0.1' }, 'user.create', 'user', ctx.userId)
      const log2 = await createAuditLog({ userId: ctx.adminId, ip: '127.0.0.1' }, 'user.update', 'user', ctx.userId)
      ctx.auditIds.push(log1.id.toString(), log2.id.toString())

      const verify = await verifyAuditChain()
      expect(verify.status).toBe('pass')
    })

    it('Detects tampering in the database', async () => {
      // Tamper the first log
      await db.update(auditLog)
        .set({ action: 'user.delete' }) // Changed action without updating hash
        .where(eq(auditLog.id, BigInt(ctx.auditIds[0])))

      const verify = await verifyAuditChain()
      expect(verify.status).toBe('fail')
      expect(verify.failedAt?.toString()).toBe(ctx.auditIds[0])

      // Restore it to keep chain clean for other tests
      await db.update(auditLog)
        .set({ action: 'user.create' })
        .where(eq(auditLog.id, BigInt(ctx.auditIds[0])))
    })
  })

  describe('PDPA Flow', () => {
    it('Submit PDPA request', async () => {
      const req = await submitPdpaRequest(ctx.userId, 'Resignation')
      ctx.pdpaId = req.id
      expect(req.status).toBe('pending')
    })

    it('Approve -> Anonymizes User PII', async () => {
      await approvePdpaRequest(ctx.pdpaId, ctx.adminId)

      const [user] = await db.select().from(users).where(eq(users.id, ctx.userId))
      expect(user.psuPassportId).toContain('anon:')
      expect(user.email).toBe('anonymized@deleted.invalid')
      expect(user.displayName).toBe('ผู้ใช้ไม่ระบุชื่อ')
    })

    it('Purge -> Marks user as deleted (Hard purge)', async () => {
      await purgePdpaData(ctx.pdpaId, ctx.adminId)

      const [user] = await db.select().from(users).where(eq(users.id, ctx.userId))
      // User is fetched because we don't filter isNull(deletedAt) directly here,
      // but deletedAt should be set.
      expect(user.deletedAt).toBeInstanceOf(Date)
    })
  })
})
