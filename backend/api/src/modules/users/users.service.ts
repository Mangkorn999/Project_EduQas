/**
 * Users & Faculties Service
 *
 * จัดการผู้ใช้ระบบ + คณะ
 * ตาม api-contracts.md §8
 *
 * สิทธิ์: super_admin เท่านั้น (ยกเว้น GET /faculties → ทุก role)
 */

import { db } from '../../../../db'
import { users, roleOverrides, faculties } from '../../../../db/schema'
import { refreshTokens } from '../../../../db/schema'
import { eq, and, isNull, ilike } from 'drizzle-orm'

export class UsersService {

  // ─── Users ──────────────────────────────────────────────────────────────────

  async listUsers(filters?: { role?: string; facultyId?: string; q?: string }) {
    const conditions = [isNull(users.deletedAt)]

    if (filters?.role) {
      conditions.push(eq(users.role, filters.role as any))
    }
    if (filters?.facultyId) {
      conditions.push(eq(users.facultyId, filters.facultyId))
    }
    if (filters?.q) {
      conditions.push(ilike(users.displayName, `%${filters.q}%`))
    }

    return db.select().from(users).where(and(...conditions))
  }

  async getUserById(id: string) {
    const [user] = await db.select().from(users).where(
      and(eq(users.id, id), isNull(users.deletedAt))
    )
    return user
  }

  async createUser(data: {
    psuPassportId: string
    email: string
    displayName: string
    role: 'admin' | 'executive' | 'super_admin' | 'teacher' | 'staff' | 'student'
    facultyId: string
  }) {
    const [user] = await db.insert(users).values({
      psuPassportId: data.psuPassportId,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      facultyId: data.facultyId,
    }).returning()
    return user
  }

  async updateUser(id: string, data: {
    displayName?: string
    role?: 'admin' | 'executive' | 'super_admin' | 'teacher' | 'staff' | 'student'
    facultyId?: string
  }) {
    const user = await this.getUserById(id)
    if (!user) throw new Error('not_found')

    const [updated] = await db.update(users)
      .set({
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.role && { role: data.role }),
        ...(data.facultyId && { facultyId: data.facultyId }),
      })
      .where(eq(users.id, id))
      .returning()

    // FR-AUTH-15: ถ้าเปลี่ยน role → revoke all tokens ของ user
    if (data.role && data.role !== user.role) {
      await db.update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(and(eq(refreshTokens.userId, id), isNull(refreshTokens.revokedAt)))
    }

    return updated
  }

  /**
   * Soft delete + revoke tokens ตาม FR-USER-07
   */
  async softDeleteUser(id: string) {
    const user = await this.getUserById(id)
    if (!user) throw new Error('not_found')

    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id))

    // Revoke all refresh tokens
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, id), isNull(refreshTokens.revokedAt)))
  }

  // ─── Faculties ──────────────────────────────────────────────────────────────

  async listFaculties() {
    return db.select().from(faculties).where(isNull(faculties.deletedAt))
  }

  async createFaculty(data: { code: string; nameTh: string; nameEn: string }) {
    const [faculty] = await db.insert(faculties).values(data).returning()
    return faculty
  }

  async updateFaculty(id: string, data: { code?: string; nameTh?: string; nameEn?: string }) {
    const [updated] = await db.update(faculties)
      .set(data)
      .where(eq(faculties.id, id))
      .returning()
    if (!updated) throw new Error('not_found')
    return updated
  }
}
