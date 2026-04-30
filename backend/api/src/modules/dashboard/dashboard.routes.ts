import { FastifyInstance } from 'fastify'
import { DashboardController } from './dashboard.controller'
import { overviewQuerySchema, scorecardQuerySchema, scorecardParamsSchema, trendQuerySchema } from './dashboard.schema'

export default async function dashboardRoutes(app: FastifyInstance) {
  const controller = new DashboardController()

  app.get('/overview', {
    preHandler: [app.authenticate, app.authorize('dashboard.faculty')],
    schema: { querystring: overviewQuerySchema }
  }, controller.overview)

  app.get('/websites/:id', {
    preHandler: [app.authenticate, app.authorize('dashboard.faculty')],
    schema: { params: scorecardParamsSchema, querystring: scorecardQuerySchema }
  }, controller.scorecard)

  app.get('/trend', {
    preHandler: [app.authenticate, app.authorize('dashboard.faculty')],
    schema: { querystring: trendQuerySchema }
  }, controller.trend)
}
