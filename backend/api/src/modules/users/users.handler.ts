import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UsersService } from './users.service'
import { TokenService } from '../auth/token.service'
import { SessionService } from '../auth/session.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { paginationSchema, paginatedResponse } from '../../utils/pagination'

export default async function usersRoutes(app: FastifyInstance) {
  const service = new UsersService()
  const tokenService = new TokenService(app)
  const sessionService = new SessionService(tokenService)

  app.get(
    '/',
    { preHandler: [authenticate, authorize(['super_admin'])] },
    async (request, reply) => {
      const query = request.query as any
      const { page, limit } = paginationSchema.parse(query)
      const { role, facultyId, status } = query

      const { data, total } = await service.listUsers({ role, facultyId, status }, page, limit)
      return paginatedResponse(data, total, page, limit)
    }
  )

  app.post(
    '/',
    {
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: {
        body: z.object({
          psuPassportId: z.string().min(1),
          email: z.string().email(),
          role: z.enum(['admin', 'executive']),
          facultyId: z.string().uuid(),
          displayName: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const body = request.body as any
      try {
        const user = await service.createUser(body)
        return reply.code(201).send({ data: user })
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
          role: z.enum(['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student']).optional(),
          facultyId: z.string().uuid().optional(),
          displayName: z.string().min(1).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as any
      const body = request.body as any

      try {
        const { user, needsRevoke, userId } = await service.updateUser(id, body)
        if (needsRevoke) {
          await sessionService.revokeAll(userId)
        }
        return { data: user }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    }
  )

  app.delete(
    '/:id',
    { preHandler: [authenticate, authorize(['super_admin'])] },
    async (request, reply) => {
      const { id } = request.params as any

      try {
        const { userId } = await service.softDeleteUser(id)
        await sessionService.revokeAll(userId)
        return { success: true }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    }
  )

  app.post(
    '/import',
    { preHandler: [authenticate, authorize(['super_admin'])] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'No file uploaded' } })
      }

      const chunks: Uint8Array[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk as Uint8Array)
      }
      const buffer = Buffer.concat(chunks)

      try {
        const result = await service.importUsersXlsx(buffer)
        return { data: result }
      } catch (err: any) {
        return reply.code(400).send({ error: { code: 'import_error', message: err.message } })
      }
    }
  )
}
