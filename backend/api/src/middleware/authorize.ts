import { FastifyRequest, FastifyReply } from 'fastify'
import { AccessTokenPayload } from '../modules/auth/token.service'

export function authorize(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AccessTokenPayload | undefined

    if (!user) {
      return reply.code(401).send({ error: { code: 'unauthenticated', message: 'Missing or invalid access token' } })
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'You do not have permission to access this resource' } })
    }
  }
}
