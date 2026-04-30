import { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify'
import { AccessTokenPayload } from '../modules/auth/token.service'
import { PermissionKey, hasPermission } from '../lib/permissions'

type AuthorizeInput = PermissionKey | string[]

export function authorize(input: AuthorizeInput): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AccessTokenPayload | undefined

    if (!user) {
      return reply.code(401).send({
        error: { code: 'unauthenticated', message: 'Missing or invalid access token' },
      })
    }

    let isAllowed = false

    if (Array.isArray(input)) {
      // Backward compatibility: role-based check
      isAllowed = input.includes(user.role)
    } else {
      // New: permission-based check
      isAllowed = hasPermission(user.role, input)
    }

    if (!isAllowed) {
      return reply.code(403).send({
        error: {
          code: 'forbidden',
          message: 'You do not have permission to access this resource',
        },
      })
    }
  }
}
