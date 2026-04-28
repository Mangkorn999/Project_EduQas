import { db } from '../../../../db'
import { rounds, roundWebsites } from '../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export class RoundsService {
  async listRounds(scopeFilter?: string, facultyFilter?: string, academicYear?: number, status?: string) {
    const filters = [isNull(rounds.deletedAt)]
    
    if (scopeFilter) filters.push(eq(rounds.scope, scopeFilter as any))
    if (facultyFilter) filters.push(eq(rounds.facultyId, facultyFilter))
    if (academicYear) filters.push(eq(rounds.academicYear, academicYear))
    if (status) filters.push(eq(rounds.status, status as any))

    return db.select().from(rounds).where(and(...filters))
  }

  async getRound(id: string, facultyScope?: string) {
    const filters = [eq(rounds.id, id), isNull(rounds.deletedAt)]
    if (facultyScope) {
      filters.push(eq(rounds.facultyId, facultyScope))
    }
    const [round] = await db.select().from(rounds).where(and(...filters))
    return round
  }

  async createRound(data: { name: string, academicYear: number, semester: number, openDate?: Date, closeDate?: Date, scope: 'faculty' | 'university', facultyId?: string, createdById: string }, websiteIds: string[] = []) {
    return db.transaction(async (tx) => {
      const [round] = await tx.insert(rounds).values(data).returning()
      
      if (websiteIds.length > 0) {
        const payload = websiteIds.map(w => ({ roundId: round.id, websiteId: w }))
        await tx.insert(roundWebsites).values(payload)
      }
      return round
    })
  }

  async updateRound(id: string, facultyScope: string | undefined, data: Partial<typeof rounds.$inferInsert>, websiteIds?: string[]) {
    return db.transaction(async (tx) => {
      const filters = [eq(rounds.id, id), isNull(rounds.deletedAt)]
      if (facultyScope) filters.push(eq(rounds.facultyId, facultyScope))

      const [existing] = await tx.select().from(rounds).where(and(...filters))
      if (!existing) throw new Error('not_found')
      if (existing.status === 'closed') throw new Error('cannot_update_closed_round')

      const [updated] = await tx.update(rounds).set(data).where(eq(rounds.id, id)).returning()

      if (websiteIds) {
        await tx.delete(roundWebsites).where(eq(roundWebsites.roundId, id))
        if (websiteIds.length > 0) {
          const payload = websiteIds.map(w => ({ roundId: id, websiteId: w }))
          await tx.insert(roundWebsites).values(payload)
        }
      }

      return updated
    })
  }

  async closeRound(id: string, facultyScope?: string) {
    const filters = [eq(rounds.id, id), isNull(rounds.deletedAt)]
    if (facultyScope) filters.push(eq(rounds.facultyId, facultyScope))

    const [existing] = await db.select().from(rounds).where(and(...filters))
    if (!existing) throw new Error('not_found')
    
    // FR-ROUND-07 will require firing an event or updating forms to auto-close.
    // For now, we update the round status.
    await db.update(rounds).set({
      status: 'closed',
      closeDate: new Date()
    }).where(eq(rounds.id, id))
  }
}
