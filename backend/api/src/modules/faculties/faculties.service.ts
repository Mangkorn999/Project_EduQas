import { db } from '../../../../db'
import { faculties } from '../../../../db/schema'
import { eq, isNull } from 'drizzle-orm'

export class FacultiesService {
  async listFaculties(includeDeleted = false) {
    if (includeDeleted) {
      return db.select().from(faculties)
    }
    return db.select().from(faculties).where(isNull(faculties.deletedAt))
  }

  async createFaculty(data: { code: string; nameTh: string; nameEn: string }) {
    const [faculty] = await db
      .insert(faculties)
      .values({
        code: data.code,
        nameTh: data.nameTh,
        nameEn: data.nameEn,
      })
      .returning()

    return faculty
  }

  async updateFaculty(id: string, data: { code?: string; nameTh?: string; nameEn?: string }) {
    const [existing] = await db.select().from(faculties).where(eq(faculties.id, id))
    if (!existing) throw new Error('not_found')

    const [updated] = await db
      .update(faculties)
      .set({
        ...(data.code !== undefined && { code: data.code }),
        ...(data.nameTh !== undefined && { nameTh: data.nameTh }),
        ...(data.nameEn !== undefined && { nameEn: data.nameEn }),
      })
      .where(eq(faculties.id, id))
      .returning()

    return updated
  }
}
