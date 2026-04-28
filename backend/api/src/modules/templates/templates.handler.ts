import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { sendError } from '../../lib/errors'
import { TemplatesService } from './templates.service'

export default async function templatesRoutes(app: FastifyInstance) {
  const service = new TemplatesService()

  app.get('/templates', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const user = request.user
    const { scope, includeDeprecated } = request.query as any

    const facultyScope = user.role === 'admin' ? (user.facultyId ?? undefined) : undefined
    const data = await service.listTemplates(scope, facultyScope, includeDeprecated === 'true')
    return { data }
  })

  app.get('/templates/:id', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user
    const facultyScope = user.role === 'admin' ? (user.facultyId ?? undefined) : undefined

    const data = await service.getTemplate(id, facultyScope)
    if (!data) return sendError(reply, 404, 'not_found', 'Template not found')
    return { data }
  })

  app.post('/templates', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        title: z.string(),
        description: z.string().optional(),
        scope: z.enum(['faculty', 'global']),
        ownerFacultyId: z.string().uuid().optional(),
      }),
    },
  }, async (request, reply) => {
    const user = request.user
    const body = request.body as any

    if (user.role === 'admin' && body.scope === 'global') {
      return sendError(reply, 403, 'forbidden', 'Admin cannot create global templates')
    }

    const ownerFacultyId = user.role === 'admin' ? user.facultyId : body.ownerFacultyId

    try {
      const data = await service.createTemplate({
        ...body,
        ownerFacultyId,
        createdById: user.userId,
      })
      return reply.code(201).send({ data })
    } catch (err: any) {
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.patch('/templates/:id', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user
    const facultyScope = user.role === 'admin' ? (user.facultyId ?? undefined) : undefined

    try {
      const data = await service.updateTemplate(id, facultyScope, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Template not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.delete('/templates/:id', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user
    const facultyScope = user.role === 'admin' ? (user.facultyId ?? undefined) : undefined

    try {
      await service.softDeleteTemplate(id, facultyScope)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Template not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.post('/templates/:id/deprecate', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user
    const facultyScope = user.role === 'admin' ? (user.facultyId ?? undefined) : undefined

    try {
      const data = await service.deprecateTemplate(id, facultyScope)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Template not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.post('/templates/:id/clone', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        ownerFacultyId: z.string().uuid().optional(),
      }).nullish(),
    },
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user
    const body = (request.body ?? {}) as any
    const facultyScope = user.role === 'admin' ? (user.facultyId ?? undefined) : undefined

    if (user.role === 'admin' && body.ownerFacultyId && body.ownerFacultyId !== user.facultyId) {
      return sendError(reply, 403, 'forbidden', 'Admin cannot clone templates across faculties')
    }

    try {
      const data = await service.cloneTemplate(
        id,
        facultyScope,
        user.userId,
        user.role === 'admin' ? user.facultyId : body.ownerFacultyId
      )
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Template not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.post('/forms/from-template/:templateId', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        roundId: z.string().uuid(),
        title: z.string().optional(),
        description: z.string().optional(),
        scope: z.enum(['faculty', 'university']),
        ownerFacultyId: z.string().uuid().optional(),
        websiteTargetId: z.string().uuid().optional(),
      }),
    },
  }, async (request, reply) => {
    const { templateId } = request.params as any
    const user = request.user
    const body = request.body as any

    if (user.role === 'admin' && body.scope === 'university') {
      return sendError(reply, 403, 'forbidden', 'Admin cannot create university forms')
    }

    try {
      const data = await service.createFormFromTemplate(templateId, {
        ...body,
        ownerFacultyId: user.role === 'admin' ? user.facultyId : body.ownerFacultyId,
        createdById: user.userId,
      })
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Template not found')
      if (err.message === 'deprecated') return sendError(reply, 410, 'deprecated', 'Template is deprecated')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })
}
