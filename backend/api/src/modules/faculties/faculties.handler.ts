import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { FacultiesService } from './faculties.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

export default async function facultiesRoutes(app: FastifyInstance) {
  const service = new FacultiesService()

  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const data = await service.listFaculties()
      return { data }
    }
  )

  app.post(
    '/',
    {
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: {
        body: z.object({
          code: z.string().min(1),
          nameTh: z.string().min(1),
          nameEn: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const body = request.body as any
      try {
        const faculty = await service.createFaculty(body)
        return reply.code(201).send({ data: faculty })
      } catch (err: any) {
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    }
  )

  app.patch(
    '/:id',
    {
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: {
        body: z.object({
          code: z.string().min(1).optional(),
          nameTh: z.string().min(1).optional(),
          nameEn: z.string().min(1).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as any
      const body = request.body as any
      try {
        const faculty = await service.updateFaculty(id, body)
        return { data: faculty }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Faculty not found' } })
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    }
  )
}
