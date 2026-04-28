import { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../../../db'
import { roleOverrides } from '../../../db/schema'
import { eq, and, isNull, gt } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()

    // FR-AUTH-15/20 — check active role override and apply to request context
    const userId = request.user.userId
    if (userId) {
      const [override] = await db
        .select({ overrideRole: roleOverrides.overrideRole })
        .from(roleOverrides)
        .where(
          and(
            eq(roleOverrides.userId, userId),
            // active = not expired (expiresAt IS NULL means permanent, or expiresAt > now)
            sql`(${roleOverrides.expiresAt} IS NULL OR ${roleOverrides.expiresAt} > now())`,
          ),
        )
        .limit(1)

      if (override) {
        (request.user as Record<string, unknown>).role = override.overrideRole
      }
    }
  } catch (err) {
    reply.code(401).send({ error: { code: 'unauthenticated', message: 'Missing or invalid access token' } })
  }
}
