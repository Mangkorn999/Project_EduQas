import { FastifyReply, FastifyRequest } from 'fastify'
import { and, count, eq, isNull } from 'drizzle-orm'
import { forms } from '../../../../db/schema'
import { scoreAllWebsitesInRound, scoreWebsite } from '../scoring/score.service'
import { checkEligibility } from '../ranking/eligibility.service'

export class DashboardController {
  overview = async (request: FastifyRequest, reply: FastifyReply) => {
    const { roundId, facultyId: queryFacultyId } = request.query as any
    const user = request.user as any
    const facultyId = user.role === 'admin' ? user.facultyId : queryFacultyId

    const allScores = await scoreAllWebsitesInRound(roundId)
    const filteredScores = facultyId ? allScores.filter(s => s.ownerFacultyId === facultyId) : allScores

    const totalWebsites = filteredScores.length
    const scoredWebsites = filteredScores.filter(s => s.score !== null)
    const totalResponses = filteredScores.reduce((sum, s) => sum + s.responseCount, 0)
    const avgScore = scoredWebsites.length > 0
      ? Math.round((scoredWebsites.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredWebsites.length) * 100) / 100
      : null

    const sorted = [...scoredWebsites].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const topRanked = sorted[0] ?? null

    const pendingForms = await request.server.db
      .select({ total: count() })
      .from(forms)
      .where(and(
        eq(forms.roundId, roundId),
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
  }

  scorecard = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const { roundId } = request.query as any
    const user = request.user as any

    const ws = await scoreWebsite(id, roundId)
    if (!ws) return reply.code(404).send({ error: { code: 'not_found', message: 'Website not found in this round' } })

    if (user.role === 'admin' && ws.ownerFacultyId !== user.facultyId) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Access denied to this website' } })
    }

    const [form] = await request.server.db
      .select({ id: forms.id })
      .from(forms)
      .where(and(
        eq(forms.websiteTargetId, id),
        eq(forms.roundId, roundId),
        isNull(forms.deletedAt),
      ))
      .limit(1)

    let eligibility: any = null
    if (form) {
      eligibility = await checkEligibility(id, roundId, form.id, ws.score)
    }

    return { data: { ...ws, eligibility } }
  }

  trend = async (request: FastifyRequest, reply: FastifyReply) => {
    const { websiteId, roundIds } = request.query as any
    const trendData: any[] = []

    for (const roundId of roundIds) {
      const ws = await scoreWebsite(websiteId, roundId)
      trendData.push({
        roundId,
        score: ws?.score ?? null,
        responseCount: ws?.responseCount ?? 0,
      })
    }

    return { data: trendData }
  }
}
