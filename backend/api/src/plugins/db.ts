import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { db } from '../../../db'

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('db', db)
}

export default fp(dbPlugin, { name: 'db' })
