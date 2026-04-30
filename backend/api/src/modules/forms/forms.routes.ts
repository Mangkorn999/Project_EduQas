import { FastifyInstance } from 'fastify'
import { FormsController } from './forms.controller'
import { 
  createFormSchema, 
  updateFormSchema, 
  criterionSchema, 
  questionSchema, 
  reorderQuestionsSchema, 
  importFormSchema, 
  createFromTemplateSchema 
} from './forms.schema'

export default async function formsRoutes(app: FastifyInstance) {
  const controller = new FormsController()

  // --- Forms ---
  app.get('/', { preHandler: [app.authenticate] }, controller.list)
  app.get('/:id', { preHandler: [app.authenticate] }, controller.get)
  app.post('/', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: createFormSchema }
  }, controller.create)
  app.patch('/:id', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: updateFormSchema }
  }, controller.update)
  app.delete('/:id', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.delete)

  // --- Criteria ---
  app.post('/:id/criteria', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: criterionSchema }
  }, controller.addCriterion)
  app.patch('/:id/criteria/:cid', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: criterionSchema.partial() }
  }, controller.updateCriterion)
  app.delete('/:id/criteria/:cid', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.deleteCriterion)

  // --- Questions ---
  // NOTE: reorder must be registered BEFORE /:qid so 'reorder' is not treated as a UUID param
  app.patch('/:id/questions/reorder', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: reorderQuestionsSchema }
  }, controller.reorderQuestions)
  app.post('/:id/questions', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: questionSchema }
  }, controller.addQuestion)
  app.patch('/:id/questions/:qid', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: questionSchema.partial() }
  }, controller.updateQuestion)
  app.delete('/:id/questions/:qid', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.deleteQuestion)

  // --- Versions & Actions ---
  app.post('/:id/publish', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.publish)
  app.get('/:id/versions', {
    preHandler: [app.authenticate]
  }, controller.listVersions)
  app.post('/:id/versions/:vid/rollback', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.rollback)
  app.post('/:id/close', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.close)
  app.post('/:id/duplicate', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.duplicate)

  // --- Import / Export ---
  app.get('/:id/export.json', {
    preHandler: [app.authenticate, app.authorize('form.create')]
  }, controller.exportJson)
  app.post('/import.json', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: importFormSchema }
  }, controller.importJson)
  app.post('/from-template/:templateId', {
    preHandler: [app.authenticate, app.authorize('form.create')],
    schema: { body: createFromTemplateSchema }
  }, controller.fromTemplate)
}
