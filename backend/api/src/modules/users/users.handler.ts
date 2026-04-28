/**
 * Users & Faculties Handler
 *
 * ตาม api-contracts.md §8:
 * - GET    /api/v1/users           → super_admin — list with filters
 * - POST   /api/v1/users           → super_admin — create admin/executive
 * - PATCH  /api/v1/users/:id       → super_admin — update role (triggers revoke-all)
 * - DELETE /api/v1/users/:id       → super_admin — soft delete + revoke tokens
 * - GET    /api/v1/faculties       → Bearer — list active faculties
 * - POST   /api/v1/faculties       → super_admin — create
 * - PATCH  /api/v1/faculties/:id   → super_admin — update
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UsersService } from './users.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { sendError } from '../../lib/errors'

export default async function usersRoutes(app: FastifyInstance) {
  const service = new UsersService()

  // ─── Users ──────────────────────────────────────────────────────────────────

  app.get('/', {
    preHandler: [authenticate, authorize(['super_admin'])],
  }, async (request, reply) => {
    const { role, facultyId, q } = request.query as any
    const data = await service.listUsers({ role, facultyId, q })
    return { data }
  })

  app.post('/', {
    preHandler: [authenticate, authorize(['super_admin'])],
    schema: {
      body: z.object({
        psuPassportId: z.string(),
        email: z.string().email(),
        displayName: z.string(),
        role: z.enum(['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student']),
        facultyId: z.string().uuid(),
      }),
    },
  }, async (request, reply) => {
    try {
      const data = await service.createUser(request.body as any)
      return reply.code(201).send({ data })
    } catch (err: any) {
      // unique constraint violation
      if (err.code === '23505') return sendError(reply, 409, 'conflict', 'User with this PSU Passport ID already exists')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.patch('/:id', {
    preHandler: [authenticate, authorize(['super_admin'])],
    schema: {
      body: z.object({
        displayName: z.string().optional(),
        role: z.enum(['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student']).optional(),
        facultyId: z.string().uuid().optional(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params as any
    try {
      const data = await service.updateUser(id, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'User not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.delete('/:id', {
    preHandler: [authenticate, authorize(['super_admin'])],
  }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await service.softDeleteUser(id)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'User not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })
}

// ─── Faculties Routes (แยก export เพื่อ mount ที่ prefix ต่างกัน) ──────────

export async function facultiesRoutes(app: FastifyInstance) {
  const service = new UsersService()

  app.get('/', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const data = await service.listFaculties()
    return { data }
  })

  app.post('/', {
    preHandler: [authenticate, authorize(['super_admin'])],
    schema: {
      body: z.object({
        code: z.string(),
        nameTh: z.string(),
        nameEn: z.string(),
      }),
    },
  }, async (request, reply) => {
    try {
      const data = await service.createFaculty(request.body as any)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.code === '23505') return sendError(reply, 409, 'conflict', 'Faculty code already exists')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })

  app.patch('/:id', {
    preHandler: [authenticate, authorize(['super_admin'])],
    schema: {
      body: z.object({
        code: z.string().optional(),
        nameTh: z.string().optional(),
        nameEn: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    const { id } = request.params as any
    try {
      const data = await service.updateFaculty(id, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return sendError(reply, 404, 'not_found', 'Faculty not found')
      return sendError(reply, 400, 'validation_error', err.message)
    }
  })
}
