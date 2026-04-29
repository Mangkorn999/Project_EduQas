import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { WebsitesService } from './websites.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

export default async function websitesRoutes(app: FastifyInstance) {
  const service = new WebsitesService()

  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as any
    const { urlStatus, q } = request.query as any
    
    // Admin sees only their faculty. Super Admin sees all.
    const scope = user.role === 'admin' ? user.facultyId : undefined
    
    const data = await service.listWebsites(scope, urlStatus, q)
    return { data }
  })

  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    
    const scope = user.role === 'admin' ? user.facultyId : undefined
    
    const data = await service.getWebsite(id, scope)
    if (!data) return reply.code(404).send({ error: { code: 'not_found', message: 'Website not found' } })
    return { data }
  })

  app.post(
    '/',
    { 
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: { body: z.object({ name: z.string(), url: z.string().url(), category: z.string().optional(), ownerFacultyId: z.string().optional() }) }
    },
    async (request, reply) => {
      const user = request.user as any
      const body = request.body as any
      
      // Enforce scope
      const ownerFacultyId = user.role === 'admin' ? user.facultyId : (body.ownerFacultyId || user.facultyId)
      
      try {
        const data = await service.createWebsite({ ...body, ownerFacultyId })
        return reply.code(201).send({ data })
      } catch (err: any) {
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    }
  )

  app.patch(
    '/:id',
    { 
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: { body: z.object({ name: z.string().optional(), url: z.string().url().optional(), category: z.string().optional() }) }
    },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any
      const scope = user.role === 'admin' ? user.facultyId : undefined
      
      try {
        const data = await service.updateWebsite(id, scope, request.body as any)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
        return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
      }
    }
  )

  app.delete('/:id', { preHandler: [authenticate, authorize(['super_admin', 'admin'])] }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const scope = user.role === 'admin' ? user.facultyId : undefined

    try {
      await service.softDeleteWebsite(id, scope)
      return { success: true }
    } catch (err: any) {
       return reply.code(403).send({ error: { code: 'forbidden', message: 'No access' } })
    }
  })

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
        const result = await service.importWebsitesXlsx(buffer)
        return { data: result }
      } catch (err: any) {
        return reply.code(400).send({ error: { code: 'import_error', message: err.message } })
      }
    }
  )
}
