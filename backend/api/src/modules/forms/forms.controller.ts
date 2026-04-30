import { FastifyReply, FastifyRequest } from 'fastify'
import { FormsService } from './forms.service'
import { CriteriaService } from './criteria.service'
import { QuestionsService } from './questions.service'
import { SnapshotService } from './snapshot.service'
import { TemplatesService } from '../templates/templates.service'
import { createAuditLog } from '../audit/audit.service'

export class FormsController {
  private formsService: FormsService
  private criteriaService: CriteriaService
  private questionsService: QuestionsService
  private snapshotService: SnapshotService
  private templatesService: TemplatesService

  constructor() {
    this.formsService = new FormsService()
    this.criteriaService = new CriteriaService()
    this.questionsService = new QuestionsService()
    this.snapshotService = new SnapshotService()
    this.templatesService = new TemplatesService()
  }

  // --- Forms ---
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const { roundId, status, ownerFacultyId } = request.query as any
    const facultyFilter = user.role === 'admin' ? user.facultyId : ownerFacultyId
    const data = await this.formsService.listForms(roundId, status, facultyFilter)
    return { data }
  }

  get = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    const form = await this.formsService.getFormById(id, facultyScope)
    
    if (!form) return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
    
    const criteria = await this.criteriaService.listByFormId(id)
    const questions = await this.questionsService.listByFormId(id)
    
    return { data: { ...form, criteria, questions } }
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const body = request.body as any

    if (user.role === 'admin' && body.scope === 'university') {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Admin cannot create university forms' } })
    }
    
    const ownerFacultyId = user.role === 'admin' ? user.facultyId : body.ownerFacultyId

    try {
      const data = await this.formsService.createForm({ ...body, ownerFacultyId, createdById: user.userId })
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.create', 'form', data.id, null, { title: body.title, scope: body.scope })
      return reply.code(201).send({ data })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    
    try {
      const data = await this.formsService.updateForm(id, facultyScope, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(400).send({ error: { code: 'business_rule', message: err.message } })
    }
  }

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    
    try {
      await this.formsService.softDeleteForm(id, facultyScope)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.delete', 'form', id)
      return { success: true }
    } catch (err: any) {
       return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
    }
  }

  // --- Criteria ---
  addCriterion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId } = request.params as any
    try {
      const data = await this.criteriaService.addCriterion(formId, request.body as any)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(400).send({ error: { code: 'error', message: err.message } })
    }
  }

  updateCriterion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId, cid: criterionId } = request.params as any
    try {
      const data = await this.criteriaService.updateCriterion(criterionId, formId, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  }

  deleteCriterion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId, cid: criterionId } = request.params as any
    try {
      await this.criteriaService.deleteCriterion(criterionId, formId)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  }

  // --- Questions ---
  addQuestion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId } = request.params as any
    try {
      const data = await this.questionsService.addQuestion(formId, request.body as any)
      return reply.code(201).send({ data })
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(400).send({ error: { code: 'error', message: err.message } })
    }
  }

  updateQuestion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId, qid: questionId } = request.params as any
    try {
      const data = await this.questionsService.updateQuestion(questionId, formId, request.body as any)
      return { data }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  }

  deleteQuestion = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId, qid: questionId } = request.params as any
    try {
      await this.questionsService.deleteQuestion(questionId, formId)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(404).send({ error: { code: 'not_found', message: err.message } })
    }
  }

  reorderQuestions = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId } = request.params as any
    try {
      await this.questionsService.reorderQuestions(formId, request.body as any)
      return { success: true }
    } catch (err: any) {
      if (err.message === 'forbidden_non_draft') return reply.code(403).send({ error: { code: 'forbidden', message: 'Can only edit draft forms' } })
      return reply.code(400).send({ error: { code: 'error', message: err.message } })
    }
  }

  // --- Versions & Actions ---
  publish = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    try {
      const data = await this.snapshotService.publishForm(id, facultyScope)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.publish', 'form', id, { status: 'draft' }, { status: 'open' })
      return { data }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'publish_error', message: err.message } })
    }
  }

  listVersions = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const data = await this.snapshotService.listVersions(id)
    return { data }
  }

  rollback = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: formId, vid: versionId } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    try {
      await this.snapshotService.rollbackToVersion(formId, versionId, facultyScope)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.rollback', 'form', formId, null, { restoredVersionId: versionId })
      return { success: true }
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'rollback_error', message: err.message } })
    }
  }

  close = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    try {
      const data = await this.formsService.closeForm(id, facultyScope)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.close', 'form', id, { status: 'open' }, { status: 'closed' })
      return { data }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  duplicate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    try {
      const data = await this.formsService.duplicateForm(id, facultyScope, user.userId)
      await createAuditLog({ userId: user.userId, ip: request.ip }, 'form.duplicate', 'form', data.id, null, { sourceFormId: id })
      return reply.code(201).send({ data })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  exportJson = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const user = request.user as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    try {
      const data = await this.formsService.exportForm(id, facultyScope)
      return reply.header('Content-Disposition', `attachment; filename="form-${id}.json"`).send(data)
    } catch (err: any) {
      return reply.code(500).send({ error: { code: 'internal_error', message: err.message } })
    }
  }

  importJson = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any
    const body = request.body as any
    const facultyScope = user.role === 'admin' ? user.facultyId : undefined
    if (user.role === 'admin' && body.form.scope === 'university') {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Admin cannot import university-scope forms' } })
    }
    try {
      const data = await this.formsService.importFormJson({ ...body.form, criteria: body.criteria, questions: body.questions }, user.userId, facultyScope)
      return reply.code(201).send({ data })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'import_error', message: err.message } })
    }
  }

  fromTemplate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { templateId } = request.params as any
    const user = request.user as any
    const body = request.body as any
    const ownerFacultyId = user.role === 'admin' ? user.facultyId : (body.ownerFacultyId ?? user.facultyId)
    try {
      const data = await this.templatesService.createFormFromTemplate(templateId, { ...body, ownerFacultyId, createdById: user.userId })
      return reply.code(201).send({ data })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }
}
