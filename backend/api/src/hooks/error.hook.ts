import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

const errorHook: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string; details?: unknown }, request, reply) => {
    const validation = (error as any).validation
    const inferredStatusCode = error.message === 'not_found'
      ? 404
      : error.message.includes('forbidden') || error.message.includes('Unauthorized')
        ? 403
        : 500
    const statusCode = validation ? 400 : error.statusCode ?? inferredStatusCode
    const code = validation
      ? 'validation_error'
      : error.code ?? (
          error.message === 'not_found'
            ? 'not_found'
            : error.message.includes('forbidden') || error.message.includes('Unauthorized')
              ? 'forbidden'
              : statusCode === 422
                ? 'business_rule'
                : statusCode === 400
                  ? 'validation_error'
                  : 'internal_error'
        )
    const message = validation
      ? 'Invalid request data'
      : statusCode >= 500
        ? 'Internal server error'
        : error.message

    if (statusCode >= 500) {
      fastify.log.error(error)
    }

    reply.status(statusCode).send({
      error: {
        code,
        message,
        requestId: request.id,
        details: validation ?? error.details,
      },
    })
  })
}

export default fp(errorHook, { name: 'error-hook' })
