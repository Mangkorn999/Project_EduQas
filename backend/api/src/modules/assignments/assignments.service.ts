import { db } from '../../../../db'
import { evaluatorAssignments, users } from '../../../../db/schema'
import { eq } from 'drizzle-orm'

export async function listAssignments(roundId: string) {
  const rows = await db
    .select({
      id: evaluatorAssignments.id,
      roundId: evaluatorAssignments.roundId,
      websiteId: evaluatorAssignments.websiteId,
      createdAt: evaluatorAssignments.createdAt,
      user: {
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
      },
    })
    .from(evaluatorAssignments)
    .innerJoin(users, eq(evaluatorAssignments.userId, users.id))
    .where(eq(evaluatorAssignments.roundId, roundId))

  return rows
}

export async function bulkAssign(
  roundId: string,
  assignments: Array<{ userId: string; websiteId: string }>,
) {
  if (assignments.length === 0) return []

  const existing = await db
    .select({ userId: evaluatorAssignments.userId, websiteId: evaluatorAssignments.websiteId })
    .from(evaluatorAssignments)
    .where(eq(evaluatorAssignments.roundId, roundId))

  const existingSet = new Set(existing.map((r) => `${r.userId}:${r.websiteId}`))

  const newValues = assignments
    .filter((a) => !existingSet.has(`${a.userId}:${a.websiteId}`))
    .map((a) => ({ roundId, userId: a.userId, websiteId: a.websiteId }))

  if (newValues.length === 0) return []

  const rows = await db
    .insert(evaluatorAssignments)
    .values(newValues)
    .returning()

  return rows
}

export async function deleteAssignment(assignmentId: string) {
  const [deleted] = await db
    .delete(evaluatorAssignments)
    .where(eq(evaluatorAssignments.id, assignmentId))
    .returning()

  if (!deleted) throw new Error('not_found')

  return deleted
}
