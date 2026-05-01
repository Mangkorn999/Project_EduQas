import { FastifyInstance } from 'fastify'
import { ReportsController } from './reports.controller'
import { exportResponsesSchema } from './reports.schema'

export default async function reportsRoutes(app: FastifyInstance) {
  const controller = new ReportsController()

  app.get('/forms/:formId/responses/export.xlsx', {
    preHandler: [app.authenticate, app.authorize('report.export_pdf')],
    schema: { params: exportResponsesSchema }
  }, controller.exportResponsesXlsx)
}
