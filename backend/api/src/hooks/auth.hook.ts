import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { and, eq, sql } from 'drizzle-orm'
import { roleOverrides } from '../../../db/schema'
import { hasPermission, PermissionKey } from '../lib/permissions'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorize: (permissions: string[] | PermissionKey) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const authHook: FastifyPluginAsync = async (fastify) => {
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()

      const userId = (request.user as any).userId
      if (userId) {
        const [override] = await fastify.db
          .select({ overrideRole: roleOverrides.overrideRole })
          .from(roleOverrides)
          .where(
            and(
              eq(roleOverrides.userId, userId),
              sql`(${roleOverrides.expiresAt} IS NULL OR ${roleOverrides.expiresAt} > now())`,
            ),
          )
          .limit(1)

        if (override) {
          ;(request.user as Record<string, unknown>).role = override.overrideRole
        }
      }
    } catch (err) {
      reply.code(401).send({ error: { code: 'unauthenticated', message: 'Missing or invalid access token' } })
    }
  }

  const authorize = (permissions: string[] | PermissionKey) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { role: string }
      
      if (!user || !user.role) {
        return reply.code(401).send({ error: { code: 'unauthenticated', message: 'User not authenticated' } })
      }

      // Backward compatibility: If array of roles is provided
      if (Array.isArray(permissions)) {
        if (!permissions.includes(user.role)) {
          return reply.code(403).send({ error: { code: 'forbidden', message: 'Insufficient role permissions' } })
        }
        return
      }

      // New: Permission key check
      if (!hasPermission(user.role, permissions)) {
        return reply.code(403).send({ error: { code: 'forbidden', message: `Required permission missing: ${permissions}` } })
      }
    }
  }

  fastify.decorate('authenticate', authenticate)
  fastify.decorate('authorize', authorize)
}

export default fp(authHook, { name: 'auth-hook', dependencies: ['db', 'jwt'] })
