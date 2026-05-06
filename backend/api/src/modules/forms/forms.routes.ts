import { FastifyInstance } from 'fastify'
import { FormsController } from './forms.controller'
import { 
  createFormSchema, 
  updateFormSchema, 
  criterionSchema, 
  questionSchema, 
  reorderQuestionsSchema, 
  importFormSchema, 
  createFromTemplateSchema,
  formIdParamsSchema,
  criterionParamsSchema,
  questionParamsSchema,
  versionParamsSchema,
  templateParamsSchema,
  listFormsQuerySchema,
} from './forms.schema'

export default async function formsRoutes(app: FastifyInstance) {
  const controller = new FormsController()

  // --- Forms ---
  app.get('/', { preHandler: [app.authenticate], schema: { querystring: listFormsQuerySchema } }, controller.list)
  app.get('/:id', { preHandler: [app.authenticate], schema: { params: formIdParamsSchema } }, controller.get)
  app.post('/', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: createFormSchema }
  }, controller.create)
  app.patch('/:id', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema, body: updateFormSchema }
  }, controller.update)
  app.delete('/:id', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema }
  }, controller.delete)

  // --- Criteria ---
  app.post('/:id/criteria', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema, body: criterionSchema }
  }, controller.addCriterion)
  app.patch('/:id/criteria/:cid', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: criterionParamsSchema, body: criterionSchema.partial() }
  }, controller.updateCriterion)
  app.delete('/:id/criteria/:cid', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: criterionParamsSchema }
  }, controller.deleteCriterion)

  // --- Questions ---
  // NOTE: reorder must be registered BEFORE /:qid so 'reorder' is not treated as a UUID param
  app.patch('/:id/questions/reorder', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema, body: reorderQuestionsSchema }
  }, controller.reorderQuestions)
  app.post('/:id/questions', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema, body: questionSchema }
  }, controller.addQuestion)
  app.patch('/:id/questions/:qid', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: questionParamsSchema, body: questionSchema.partial() }
  }, controller.updateQuestion)
  app.delete('/:id/questions/:qid', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: questionParamsSchema }
  }, controller.deleteQuestion)

  // --- Versions & Actions ---
  app.post('/:id/publish', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema }
  }, controller.publish)
  app.get('/:id/versions', {
    preHandler: [app.authenticate],
    schema: { params: formIdParamsSchema }
  }, controller.listVersions)
  app.post('/:id/versions/:vid/rollback', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: versionParamsSchema }
  }, controller.rollback)
  app.post('/:id/close', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema }
  }, controller.close)
  app.post('/:id/reopen', {
    preHandler: [app.authenticate, app.authorize('form.reopen')],
    schema: { params: formIdParamsSchema }
  }, controller.reopen)
  app.post('/:id/duplicate', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema }
  }, controller.duplicate)

  // --- Import / Export ---
  app.get('/:id/export.json', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: formIdParamsSchema }
  }, controller.exportJson)
  app.post('/import.json', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: importFormSchema }
  }, controller.importJson)
  app.post('/from-template/:templateId', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { params: templateParamsSchema, body: createFromTemplateSchema }
  }, controller.fromTemplate)
}
