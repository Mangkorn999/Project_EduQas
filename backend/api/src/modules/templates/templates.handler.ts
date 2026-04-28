import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TemplatesService } from './templates.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { paginationSchema } from '../../utils/pagination'

export default async function templatesRoutes(app: FastifyInstance) {
  const service = new TemplatesService()

  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = request.query as any
      const { page, limit } = paginationSchema.parse(query)
      const filters = {
        scope: query.scope as string | undefined,
        facultyId: query.facultyId as string | undefined,
        includeDeprecated: query.includeDeprecated === 'true',
      }
      const result = await service.listTemplates(filters, page, limit)
      return result
    },
  )

  app.post(
    '/',
    {
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: {
        body: z.object({
          title: z.string().min(1),
          scope: z.enum(['faculty', 'global']),
          ownerFacultyId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const user = request.user as any
      const body = request.body as any

      const ownerFacultyId =
        user.role === 'admin' ? user.facultyId : (body.ownerFacultyId ?? user.facultyId)

      try {
        const data = await service.createTemplate({
          title: body.title,
          scope: body.scope,
          ownerFacultyId,
          ownerUserId: user.sub,
        })
        return reply.code(201).send({ data })
      } catch (err: any) {
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    },
  )

  app.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as any
      try {
        const data = await service.getTemplate(id)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found')
          return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
        throw err
      }
    },
  )

  app.patch(
    '/:id',
    {
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: {
        body: z.object({
          title: z.string().min(1).optional(),
          scope: z.enum(['faculty', 'global']).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any
      const body = request.body as any

      try {
        const existing = await service.getTemplate(id)

        if (
          user.role === 'admin' &&
          existing.ownerFacultyId !== user.facultyId
        ) {
          return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
        }

        const data = await service.updateTemplate(id, body)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found')
          return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    },
  )

  app.delete(
    '/:id',
    { preHandler: [authenticate, authorize(['super_admin', 'admin'])] },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any

      try {
        const existing = await service.getTemplate(id)

        if (
          user.role === 'admin' &&
          existing.ownerFacultyId !== user.facultyId
        ) {
          return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
        }

        await service.softDeleteTemplate(id)
        return { success: true }
      } catch (err: any) {
        if (err.message === 'not_found')
          return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
        throw err
      }
    },
  )

  app.post(
    '/:id/deprecate',
    { preHandler: [authenticate, authorize(['super_admin', 'admin'])] },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any

      try {
        const existing = await service.getTemplate(id)

        if (
          user.role === 'admin' &&
          existing.ownerFacultyId !== user.facultyId
        ) {
          return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
        }

        const data = await service.deprecateTemplate(id)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found')
          return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
        throw err
      }
    },
  )

  app.post(
    '/:id/clone',
    {
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: {
        body: z.object({
          targetFacultyId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any
      const body = request.body as any

      const targetFacultyId =
        user.role === 'admin' ? user.facultyId : body.targetFacultyId

      try {
        const data = await service.cloneTemplate(id, targetFacultyId, user.sub, user.role)
        return reply.code(201).send({ data })
      } catch (err: any) {
        if (err.message === 'not_found')
          return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
        throw err
      }
    },
  )

  app.post(
    '/forms/from-template/:templateId',
    {
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: {
        body: z.object({
          title: z.string().min(1),
          roundId: z.string().uuid().optional(),
          websiteUrl: z.string().url().optional(),
          websiteName: z.string().optional(),
          scope: z.enum(['faculty', 'university']),
          ownerFacultyId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { templateId } = request.params as any
      const user = request.user as any
      const body = request.body as any

      const ownerFacultyId =
        user.role === 'admin' ? user.facultyId : (body.ownerFacultyId ?? user.facultyId)

      try {
        const data = await service.createFormFromTemplate(templateId, {
          ...body,
          ownerFacultyId,
          createdById: user.sub,
        })
        return reply.code(201).send({ data })
      } catch (err: any) {
        if (err.message === 'not_found')
          return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    },
  )
}
