import { FastifyReply, FastifyRequest } from 'fastify'
import { FacultiesService } from './faculties.service'

export class FacultiesController {
  private service: FacultiesService

  constructor() {
    this.service = new FacultiesService()
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await this.service.listFaculties()
    return { data }
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any
    try {
      const faculty = await this.service.createFaculty(body)
      return reply.code(201).send({ data: faculty })
    } catch (err: any) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any
    const body = request.body as any
    try {
      const faculty = await this.service.updateFaculty(id, body)
      return { data: faculty }
    } catch (err: any) {
      if (err.message === 'not_found') return reply.code(404).send({ error: { code: 'not_found', message: 'Faculty not found' } })
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message } })
    }
  }
}
