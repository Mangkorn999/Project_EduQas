/**
 * Ranking API Handler
 *
 * Endpoints ตาม api-contracts.md §12:
 * - GET /api/v1/ranking/top       → Top 10 (FR-RANK-01)
 * - GET /api/v1/ranking/bottom    → Bottom 5 (FR-RANK-02)
 * - GET /api/v1/ranking/most-improved → Most Improved (FR-RANK-03)
 * - GET /api/v1/ranking/heatmap   → Faculty × Dimension (FR-RANK-04)
 *
 * สิทธิ์: super_admin + executive เท่านั้น (FR-RANK-05/06)
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { getTopRanking, getBottomRanking, getMostImproved, getHeatmap } from './ranking.service'

const rankingQuerySchema = z.object({
  roundId: z.string().uuid(),
  facultyId: z.string().uuid().optional(),
  category: z.string().optional(),
})

const mostImprovedQuerySchema = z.object({
  currentRoundId: z.string().uuid(),
  previousRoundId: z.string().uuid(),
  facultyId: z.string().uuid().optional(),
})

export default async function rankingRoutes(app: FastifyInstance) {

  // GET /top — Top 10
  app.get('/top', {
    preHandler: [authenticate, authorize(['super_admin', 'executive'])],
  }, async (request, reply) => {
    try {
      const query = rankingQuerySchema.parse(request.query)
      const data = await getTopRanking(query.roundId, {
        facultyId: query.facultyId,
        category: query.category,
      })
      return { data }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'Invalid query parameters', details: err.errors } })
      }
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'internal_error', message: 'Failed to compute ranking' } })
    }
  })

  // GET /bottom — Bottom 5
  app.get('/bottom', {
    preHandler: [authenticate, authorize(['super_admin', 'executive'])],
  }, async (request, reply) => {
    try {
      const query = rankingQuerySchema.parse(request.query)
      const data = await getBottomRanking(query.roundId, {
        facultyId: query.facultyId,
      })
      return { data }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'Invalid query parameters', details: err.errors } })
      }
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'internal_error', message: 'Failed to compute ranking' } })
    }
  })

  // GET /most-improved — Most Improved (FR-RANK-03)
  app.get('/most-improved', {
    preHandler: [authenticate, authorize(['super_admin', 'executive'])],
  }, async (request, reply) => {
    try {
      const query = mostImprovedQuerySchema.parse(request.query)
      const data = await getMostImproved(query.currentRoundId, query.previousRoundId, {
        facultyId: query.facultyId,
      })
      return { data }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'Invalid query parameters', details: err.errors } })
      }
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'internal_error', message: 'Failed to compute ranking' } })
    }
  })

  // GET /heatmap — Faculty × Dimension Grid (FR-RANK-04)
  app.get('/heatmap', {
    preHandler: [authenticate, authorize(['super_admin', 'executive'])],
  }, async (request, reply) => {
    try {
      const { roundId } = z.object({ roundId: z.string().uuid() }).parse(request.query)
      const data = await getHeatmap(roundId)
      return { data }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'Invalid query parameters', details: err.errors } })
      }
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'internal_error', message: 'Failed to compute heatmap' } })
    }
  })
}
