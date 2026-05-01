import { FastifyReply, FastifyRequest } from 'fastify'
import { getTopRanking, getBottomRanking, getMostImproved, getHeatmap } from './ranking.service'

export class RankingController {
  top = async (request: FastifyRequest, reply: FastifyReply) => {
    const { roundId, facultyId, category } = request.query as any
    const data = await getTopRanking(roundId, { facultyId, category })
    return { data }
  }

  bottom = async (request: FastifyRequest, reply: FastifyReply) => {
    const { roundId, facultyId } = request.query as any
    const data = await getBottomRanking(roundId, { facultyId })
    return { data }
  }

  mostImproved = async (request: FastifyRequest, reply: FastifyReply) => {
    const { currentRoundId, previousRoundId, facultyId } = request.query as any
    const data = await getMostImproved(currentRoundId, previousRoundId, { facultyId })
    return { data }
  }

  heatmap = async (request: FastifyRequest, reply: FastifyReply) => {
    const { roundId } = request.query as any
    const data = await getHeatmap(roundId)
    return { data }
  }
}
