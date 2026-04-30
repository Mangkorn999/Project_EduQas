import { FastifyInstance } from 'fastify'
import { RankingController } from './ranking.controller'
import { rankingQuerySchema, mostImprovedQuerySchema, heatmapQuerySchema } from './ranking.schema'

export default async function rankingRoutes(app: FastifyInstance) {
  const controller = new RankingController()

  app.get('/top', {
    preHandler: [app.authenticate, app.authorize('dashboard.cross_faculty')],
    schema: { querystring: rankingQuerySchema }
  }, controller.top)

  app.get('/bottom', {
    preHandler: [app.authenticate, app.authorize('dashboard.cross_faculty')],
    schema: { querystring: rankingQuerySchema }
  }, controller.bottom)

  app.get('/most-improved', {
    preHandler: [app.authenticate, app.authorize('dashboard.cross_faculty')],
    schema: { querystring: mostImprovedQuerySchema }
  }, controller.mostImproved)

  app.get('/heatmap', {
    preHandler: [app.authenticate, app.authorize('dashboard.cross_faculty')],
    schema: { querystring: heatmapQuerySchema }
  }, controller.heatmap)
}
