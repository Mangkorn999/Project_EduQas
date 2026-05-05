import { db } from '../../../../db'
import { evaluatorAssignments, users } from '../../../../db/schema'
import { eq, and, inArray, isNull } from 'drizzle-orm'

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

// Query how many users match the given roles + optional facultyId
// Used by AssignmentDialog to show preview before confirming
export async function previewAssignmentCount(
  roles: string[],
  facultyId: string | 'all',
) {
  const filters = [isNull(users.deletedAt), inArray(users.role, roles as any[])]
  if (facultyId !== 'all') {
    filters.push(eq(users.facultyId, facultyId))
  }

  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(and(...filters))

  const byRole: Record<string, number> = {}
  for (const row of rows) {
    byRole[row.role] = (byRole[row.role] ?? 0) + 1
  }

  return { total: rows.length, byRole }
}

// Assign all users matching roles + facultyId to the given roundId + websiteId
// Skips users who already have an assignment for this (roundId, websiteId)
export async function bulkAssignByRole(
  roundId: string,
  websiteId: string,
  roles: string[],
  facultyId: string | 'all',
  adminFacultyId?: string, // enforce that admin cannot bypass their own faculty
) {
  // Security: admin can only assign within their own faculty
  if (adminFacultyId && facultyId !== adminFacultyId) {
    throw new Error('forbidden')
  }

  const filters = [isNull(users.deletedAt), inArray(users.role, roles as any[])]
  if (facultyId !== 'all') {
    filters.push(eq(users.facultyId, facultyId))
  }

  const matchingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...filters))

  const assignments = matchingUsers.map((u) => ({ userId: u.id, websiteId }))
  return bulkAssign(roundId, assignments)
}

export async function deleteAssignment(assignmentId: string) {
  const [deleted] = await db
    .delete(evaluatorAssignments)
    .where(eq(evaluatorAssignments.id, assignmentId))
    .returning()

  if (!deleted) throw new Error('not_found')

  return deleted
}
