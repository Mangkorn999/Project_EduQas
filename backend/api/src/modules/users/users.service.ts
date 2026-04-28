import ExcelJS from 'exceljs'
import { db } from '../../../../db'
import { users, faculties } from '../../../../db/schema'
import { eq, and, isNull, isNotNull, count, type SQL } from 'drizzle-orm'
import { getPaginationOffset } from '../../utils/pagination'

type UserRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'

interface ListUsersFilters {
  role?: UserRole
  facultyId?: string
  status?: 'active' | 'deleted'
}

export class UsersService {
  async listUsers(filters: ListUsersFilters, page: number, limit: number) {
    const conditions: SQL<unknown>[] = []

    if (filters.status === 'deleted') {
      conditions.push(isNotNull(users.deletedAt))
    } else {
      conditions.push(isNull(users.deletedAt))
    }

    if (filters.role) {
      conditions.push(eq(users.role, filters.role))
    }

    if (filters.facultyId) {
      conditions.push(eq(users.facultyId, filters.facultyId))
    }

    const where = and(...conditions)
    const offset = getPaginationOffset(page, limit)

    const [data, [{ value: total }]] = await Promise.all([
      db.select().from(users).where(where).limit(limit).offset(offset),
      db.select({ value: count() }).from(users).where(where),
    ])

    return { data, total: Number(total) }
  }

  async createUser(data: {
    psuPassportId: string
    email: string
    role: UserRole
    facultyId: string
    displayName: string
  }) {
    const [user] = await db.insert(users).values({
      psuPassportId: data.psuPassportId,
      email: data.email,
      role: data.role,
      facultyId: data.facultyId,
      displayName: data.displayName,
    }).returning()

    return user
  }

  async updateUser(userId: string, data: { role?: UserRole; facultyId?: string; displayName?: string }) {
    const [existing] = await db.select().from(users).where(eq(users.id, userId))
    if (!existing) throw new Error('not_found')

    const [updated] = await db
      .update(users)
      .set({
        ...(data.role !== undefined && { role: data.role }),
        ...(data.facultyId !== undefined && { facultyId: data.facultyId }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
      })
      .where(eq(users.id, userId))
      .returning()

    const roleChanged = data.role !== undefined && data.role !== existing.role

    return { user: updated, needsRevoke: roleChanged, userId }
  }

  async softDeleteUser(userId: string) {
    const [existing] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt)))
    if (!existing) throw new Error('not_found')

    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId))

    return { needsRevoke: true, userId }
  }

  async importUsersXlsx(buffer: Uint8Array) {
    const workbook = new ExcelJS.Workbook()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new Error('empty_workbook')

    const facultyCache = new Map<string, string>()
    const created: number[] = []
    const updated: number[] = []
    const errors: { row: number; reason: string }[] = []

    const rows: ExcelJS.Row[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push(row)
    })

    for (const row of rows) {
      const rowNumber = row.number
      const psuPassportId = String(row.getCell(1).value ?? '').trim()
      const email = String(row.getCell(2).value ?? '').trim()
      const role = String(row.getCell(3).value ?? '').trim() as UserRole
      const facultyCode = String(row.getCell(4).value ?? '').trim()
      const displayName = String(row.getCell(5).value ?? '').trim()

      if (!psuPassportId || !email || !role || !facultyCode) {
        errors.push({ row: rowNumber, reason: 'missing required fields: psu_passport_id, email, role, faculty_code' })
        continue
      }

      const validRoles: UserRole[] = ['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student']
      if (!validRoles.includes(role)) {
        errors.push({ row: rowNumber, reason: `invalid role: ${role}` })
        continue
      }

      let facultyId = facultyCache.get(facultyCode)
      if (!facultyId) {
        const [faculty] = await db.select().from(faculties).where(eq(faculties.code, facultyCode))
        if (!faculty) {
          errors.push({ row: rowNumber, reason: `faculty not found for code: ${facultyCode}` })
          continue
        }
        facultyCache.set(facultyCode, faculty.id)
        facultyId = faculty.id
      }

      const [existing] = await db.select().from(users).where(eq(users.psuPassportId, psuPassportId))

      if (existing) {
        await db
          .update(users)
          .set({
            email,
            role,
            facultyId,
            ...(displayName && { displayName }),
            deletedAt: null,
          })
          .where(eq(users.id, existing.id))
        updated.push(rowNumber)
      } else {
        await db.insert(users).values({
          psuPassportId,
          email,
          role,
          facultyId,
          displayName: displayName || email,
        })
        created.push(rowNumber)
      }
    }

    return { created: created.length, updated: updated.length, errors }
  }
}
