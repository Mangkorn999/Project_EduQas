import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { FormsService } from './forms.service'
import { CriteriaService } from './criteria.service'
import { QuestionsService } from './questions.service'
import { SnapshotService } from './snapshot.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'

export default async function formsRoutes(app: FastifyInstance) {
  const formsService = new FormsService()
  const criteriaService = new CriteriaService()
  const questionsService = new QuestionsService()
  const snapshotService = new SnapshotService()

  // ─── Forms ────────────────────────────────────────────────────────────────────

  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as any
    const { roundId, status, ownerFacultyId } = request.query as any
    
    // Admin sees only their faculty or university scope is managed by dashboard.
    // Here we allow filtering, but enforce faculty if user is admin.
    const facultyFilter = user.role === 'admin' ? user.facultyId : ownerFacultyId
    
    const data = await formsService.listForms(roundId, status, facultyFilter)
    return { data }
  })

  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    const form = await formsService.getFormById(id, facultyScope)
    
    if (!form) return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
    
    const criteria = await criteriaService.listByFormId(id)
    const questions = await questionsService.listByFormId(id)
    
    return { 
      data: {
        ...form,
        criteria,
        questions
      } 
    }
  })

  app.post(
    '/',
    { 
      preHandler: [authenticate, authorize(['super_admin', 'admin'])],
      schema: { 
        body: z.object({ 
          title: z.string(), 
          description: z.string().optional(),
          roundId: z.string().uuid(), 
          scope: z.enum(['faculty', 'university']),
          ownerFacultyId: z.string().uuid().optional(),
          websiteTargetId: z.string().uuid().optional()
        }) 
      }
    },
    async (request, reply) => {
      const user = request.user as any
      const body = request.body as any

      if (user.role === 'admin' && body.scope === 'university') {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Admin cannot create university forms' } })
      }
      
      const ownerFacultyId = user.role === 'admin' ? user.facultyId : body.ownerFacultyId

      try {
        const data = await formsService.createForm({
          ...body,
          ownerFacultyId,
          createdById: user.userId
        })
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
      schema: { 
        body: z.object({ 
          title: z.string().optional(), 
          description: z.string().optional(),
          status: z.enum(['draft', 'open', 'closed']).optional(),
          websiteTargetId: z.string().uuid().optional()
        }) 
      }
    },
    async (request, reply) => {
      const { id } = request.params as any
      const user = request.user as any
      const facultyScope = user.role === 'admin' ? user.facultyId : undefined
      
      try {
        const data = await formsService.updateForm(id, facultyScope, request.body as any)
        return { data }
      } catch (err: any) {
        if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
        if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
        return reply.code(400).send({ error: { code: 'business_rule', message: err.message } })
      }
    }
  )

  app.delete('/:id', { preHandler: [authenticate, authorize(['super_admin', 'admin'])] }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    
    try {
      await formsService.softDeleteForm(id, facultyScope)
      return { success: true }
    } catch (err: any) {
       return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
    }
  })

  // ─── Criteria ─────────────────────────────────────────────────────────────────

  app.post('/:id/criteria', { 
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        name: z.string(),
        dimension: z.string().optional(),
        weight: z.number().int().min(1)
      })
    }
  }, async (request, reply) => {
    const { id: formId } = request.params as any
    try {
      const data = await criteriaService.addCriterion(formId, request.body as any)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(400).send({ error: { code: 'error', message: err.message } })
    }
  })

  app.patch('/:id/criteria/:cid', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        name: z.string().optional(),
        dimension: z.string().optional(),
        weight: z.number().int().min(1).optional()
      })
    }
  }, async (request, reply) => {
    const { id: formId, cid: criterionId } = request.params as any
    try {
      const data = await criteriaService.updateCriterion(criterionId, formId, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  })

  app.delete('/:id/criteria/:cid', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id: formId, cid: criterionId } = request.params as any
    try {
      await criteriaService.deleteCriterion(criterionId, formId)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  })

  // ─── Questions ────────────────────────────────────────────────────────────────

  app.post('/:id/questions', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        questionType: z.enum(['short_text', 'long_text', 'single_choice', 'multi_choice', 'rating', 'scale_5', 'scale_10', 'boolean', 'date', 'number']),
        label: z.string(),
        criterionId: z.string().uuid().optional(),
        helpText: z.string().optional(),
        isRequired: z.boolean().optional(),
        config: z.any().optional(),
        sortOrder: z.number().int().optional()
      })
    }
  }, async (request, reply) => {
    const { id: formId } = request.params as any
    try {
      const data = await questionsService.addQuestion(formId, request.body as any)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(400).send({ error: { code: 'error', message: err.message } })
    }
  })

  app.patch('/:id/questions/:qid', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        label: z.string().optional(),
        helpText: z.string().optional(),
        isRequired: z.boolean().optional(),
        config: z.any().optional(),
        sortOrder: z.number().int().optional()
      })
    }
  }, async (request, reply) => {
    const { id: formId, qid: questionId } = request.params as any
    try {
      const data = await questionsService.updateQuestion(questionId, formId, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  })

  app.delete('/:id/questions/:qid', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id: formId, qid: questionId } = request.params as any
    try {
      await questionsService.deleteQuestion(questionId, formId)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  })

  app.patch('/:id/questions/reorder', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.array(z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int()
      }))
    }
  }, async (request, reply) => {
    const { id: formId } = request.params as any
    try {
      await questionsService.reorderQuestions(formId, request.body as any)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(400).send({ error: { code: 'error', message: err.message } })
    }
  })

  // ─── Versions ─────────────────────────────────────────────────────────────────

  app.post('/:id/publish', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    
    try {
      const data = await snapshotService.publishForm(id, facultyScope)
      return { data }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'publish_error', message: err.message } })
    }
  })

  app.post('/:id/close', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined

    try {
      const data = await formsService.closeForm(id, facultyScope)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
      if (err.message === 'form_not_open') return reply.code(422).send({ error: { code: 'business_rule', message: 'Can only close open forms' } })
      return reply.code(400).send({ error: { code: 'business_rule', message: err.message } })
    }
  })

  app.post('/:id/duplicate', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined

    try {
      const data = await formsService.duplicateForm(id, facultyScope)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
      return reply.code(400).send({ error: { code: 'business_rule', message: err.message } })
    }
  })

  app.get('/:id/versions', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    const { id } = request.params as any
    const data = await snapshotService.listVersions(id)
    return { data }
  })

  app.post('/:id/versions/:vid/rollback', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id: formId, vid: versionId } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    
    try {
      await snapshotService.rollbackToVersion(formId, versionId, facultyScope)
      return { success: true }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'rollback_error', message: err.message } })
    }
  })
}
