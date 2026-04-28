/**
 * Dashboard API Handler
 *
 * Endpoints ตาม api-contracts.md §12:
 * - GET /api/v1/dashboard/overview          → Summary stats (FR-DASH-01~03)
 * - GET /api/v1/dashboard/websites/:id      → Scorecard per website (FR-DASH-11)
 * - GET /api/v1/dashboard/trend             → Trend across rounds (FR-DASH-06)
 *
 * สิทธิ์:
 * - super_admin: เห็นทุกคณะ
 * - admin: เห็นเฉพาะคณะตัวเอง
 * - executive: เห็นทุกคณะ (read-only)
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { AccessTokenPayload } from '../auth/token.service'
import { scoreAllWebsitesInRound, scoreWebsite, scoreForm } from '../scoring/score.service'
import { checkEligibility } from '../ranking/eligibility.service'
import { db } from '../../../../db'
import { eq, and, isNull, isNotNull, count } from 'drizzle-orm'
import { forms, responses, rounds, websites } from '../../../../db/schema'

export default async function dashboardRoutes(app: FastifyInstance) {

  // GET /overview — Dashboard summary
  app.get('/overview', {
    preHandler: [authenticate, authorize(['super_admin', 'admin', 'executive'])],
  }, async (request, reply) => {
    try {
      const query = z.object({
        roundId: z.string().uuid(),
        facultyId: z.string().uuid().optional(),
      }).parse(request.query)

      const user = request.user as AccessTokenPayload

      // admin เห็นได้เฉพาะคณะตัวเอง
      const facultyId = user.role === 'admin' ? user.facultyId : query.facultyId

      let allScores = await scoreAllWebsitesInRound(query.roundId)

      // กรองตาม faculty scope
      if (facultyId) {
        allScores = allScores.filter(s => s.ownerFacultyId === facultyId)
      }

      // คำนวณ summary stats
      const totalWebsites = allScores.length
      const scoredWebsites = allScores.filter(s => s.score !== null)
      const totalResponses = allScores.reduce((sum, s) => sum + s.responseCount, 0)
      const avgScore = scoredWebsites.length > 0
        ? Math.round((scoredWebsites.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredWebsites.length) * 100) / 100
        : null

      // Top ranked
      const sorted = [...scoredWebsites].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      const topRanked = sorted[0] ?? null

      // Pending (form ที่ยังเปิดอยู่)
      const pendingForms = await db
        .select({ total: count() })
        .from(forms)
        .where(and(
          eq(forms.roundId, query.roundId),
          eq(forms.status, 'open'),
          isNull(forms.deletedAt),
          ...(facultyId ? [eq(forms.ownerFacultyId, facultyId)] : []),
        ))

      return {
        data: {
          totalWebsites,
          evaluatedWebsites: scoredWebsites.length,
          totalResponses,
          averageScore: avgScore,
          pendingForms: pendingForms[0]?.total ?? 0,
          topRanked: topRanked ? {
            websiteId: topRanked.websiteId,
            websiteName: topRanked.websiteName,
            score: topRanked.score,
          } : null,
        }
      }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'Invalid query parameters', details: err.errors } })
      }
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'internal_error', message: 'Failed to load dashboard' } })
    }
  })

  // GET /websites/:id — Scorecard per website (FR-DASH-11)
  app.get('/websites/:id', {
    preHandler: [authenticate, authorize(['super_admin', 'admin', 'executive'])],
  }, async (request, reply) => {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
      const { roundId } = z.object({ roundId: z.string().uuid() }).parse(request.query)

      const user = request.user as AccessTokenPayload

      const ws = await scoreWebsite(id, roundId)
      if (!ws) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Website not found in this round' } })
      }

      // admin ต้องเป็นเจ้าของคณะเท่านั้น
      if (user.role === 'admin' && ws.ownerFacultyId !== user.facultyId) {
        return reply.code(403).send({ error: { code: 'forbidden', message: 'Access denied to this website' } })
      }

      // ดึง eligibility
      const [form] = await db
        .select({ id: forms.id })
        .from(forms)
        .where(and(
          eq(forms.websiteTargetId, id),
          eq(forms.roundId, roundId),
          isNull(forms.deletedAt),
        ))
        .limit(1)

      let eligibility: Awaited<ReturnType<typeof checkEligibility>> | null = null
      if (form) {
        eligibility = await checkEligibility(id, roundId, form.id, ws.score)
      }

      return {
        data: {
          ...ws,
          eligibility,
        }
      }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'Invalid parameters', details: err.errors } })
      }
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'internal_error', message: 'Failed to load scorecard' } })
    }
  })

  // GET /trend — Trend across rounds (FR-DASH-06)
  app.get('/trend', {
    preHandler: [authenticate, authorize(['super_admin', 'admin', 'executive'])],
  }, async (request, reply) => {
    try {
      const query = z.object({
        websiteId: z.string().uuid(),
        // ส่ง roundIds มาเป็น comma-separated (เช่น ?roundIds=uuid1,uuid2,uuid3)
        roundIds: z.string().transform(s => s.split(',')),
      }).parse(request.query)

      const user = request.user as AccessTokenPayload

      // ดึง score ของ website ในแต่ละ round
      const trendData: { roundId: string; score: number | null; responseCount: number }[] = []

      for (const roundId of query.roundIds) {
        const ws = await scoreWebsite(query.websiteId, roundId)
        trendData.push({
          roundId,
          score: ws?.score ?? null,
          responseCount: ws?.responseCount ?? 0,
        })
      }

      return { data: trendData }
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.code(400).send({ error: { code: 'validation_error', message: 'Invalid query parameters', details: err.errors } })
      }
      request.log.error(err)
      return reply.code(500).send({ error: { code: 'internal_error', message: 'Failed to load trend' } })
    }
  })
}
