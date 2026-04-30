import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { FormsService } from './forms.service'
import { CriteriaService } from './criteria.service'
import { QuestionsService } from './questions.service'
import { SnapshotService } from './snapshot.service'
import { TemplatesService } from '../templates/templates.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { createAuditLog } from '../audit/audit.service'

export default async function formsRoutes(app: FastifyInstance) {
  const formsService = new FormsService()
  const criteriaService = new CriteriaService()
  const questionsService = new QuestionsService()
  const snapshotService = new SnapshotService()
  const templatesService = new TemplatesService()

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
        // FR-AUDIT-01: บันทึกการสร้าง form
        await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.create', 'form', data.id, null, { title: body.title, scope: body.scope })
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
      // FR-AUDIT-01: บันทึกการลบ form
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.delete', 'form', id)
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
        questionType: z.enum(['short_text', 'long_text', 'single_choice', 'multi_choice', 'rating', 'scale_5', 'scale_10', 'boolean', 'date', 'number']).optional(),
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
      // FR-FORM-25: บันทึกการ publish form (เปลี่ยน draft → open)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.publish', 'form', id, { status: 'draft' }, { status: 'open' })
      return { data }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'publish_error', message: err.message } })
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
      // FR-FORM-20: บันทึกการ rollback form
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.rollback', 'form', formId, null, { restoredVersionId: versionId })
      return { success: true }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'rollback_error', message: err.message } })
    }
  })

  // ─── Close ────────────────────────────────────────────────────────────────────

  app.post('/:id/close', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined

    try {
      const data = await formsService.closeForm(id, facultyScope)
      // FR-AUDIT-01: บันทึกการปิด form
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.close', 'form', id, { status: 'open' }, { status: 'closed' })
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
      if (err.message === 'already_closed') return reply.code(422).send({ error: { code: 'business_rule', message: 'Form is already closed' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  })

  // ─── Duplicate ────────────────────────────────────────────────────────────────

  app.post('/:id/duplicate', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined

    try {
      const data = await formsService.duplicateForm(id, facultyScope, user.userId)
      // FR-AUDIT-01: บันทึกการ duplicate form
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.duplicate', 'form', data.id, null, { sourceFormId: id })
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  })

  // ─── Export JSON ──────────────────────────────────────────────────────────────

  app.get('/:id/export.json', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])]
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined

    try {
      const data = await formsService.exportForm(id, facultyScope)
      return reply
        .header('Content-Disposition', `attachment; filename="form-${id}.json"`)
        .send(data)
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
      return reply.code(500).send({ error: { code: 'internal_error', message: err.message } })
    }
  })

  // ─── Import JSON ──────────────────────────────────────────────────────────────

  app.post('/import.json', {
    preHandler: [authenticate, authorize(['super_admin', 'admin'])],
    schema: {
      body: z.object({
        form: z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          scope: z.enum(['faculty', 'university']),
        }),
        criteria: z.array(z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          dimension: z.string().optional(),
          weight: z.number().int().min(1).optional(),
        })).optional().default([]),
        questions: z.array(z.object({
          questionType: z.enum(['short_text', 'long_text', 'single_choice', 'multi_choice', 'rating', 'scale_5', 'scale_10', 'boolean', 'date', 'number']),
          label: z.string().min(1),
          criterionId: z.string().optional(),
          helpText: z.string().optional(),
          isRequired: z.boolean().optional(),
          config: z.any().optional(),
          sortOrder: z.number().int().optional(),
        })).optional().default([]),
      })
    }
  }, async (request, reply) => {
    const user = request.user as any
    const body = request.body as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined

    if (user.role === 'admin' && body.form.scope === 'university') {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Admin cannot import university-scope forms' } })
    }

    try {
      const data = await formsService.importFormJson(
        { ...body.form, criteria: body.criteria, questions: body.questions },
        user.userId,
        facultyScope
      )
      return reply.code(201).send({ data })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'import_error', message: err.message } })
    }
  })

  // ─── From Template ────────────────────────────────────────────────────────────

  app.post('/from-template/:templateId', {
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
  }, async (request, reply) => {
    const { templateId } = request.params as any
    const user = request.user as any
    const body = request.body as any
    const ownerFacultyId = user.role === 'admin' ? user.facultyId : (body.ownerFacultyId ?? user.facultyId)

    try {
      const data = await templatesService.createFormFromTemplate(templateId, {
        ...body,
        ownerFacultyId,
        createdById: user.userId,
      })
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Template not found' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  })
}
