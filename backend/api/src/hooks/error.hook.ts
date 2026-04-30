import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

const errorHook: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string; details?: unknown }, request, reply) => {
    const statusCode = error.statusCode ?? 500
    const code = error.code ?? (statusCode === 422 ? 'business_rule' : statusCode === 400 ? 'validation_error' : 'internal_error')

    if (statusCode >= 500) {
      fastify.log.error(error)
    }

    reply.status(statusCode).send({
      error: {
        code,
        message: statusCode >= 500 ? 'Internal server error' : error.message,
        requestId: request.id,
        details: error.details,
      },
    })
  })
}

export default fp(errorHook, { name: 'error-hook' })
