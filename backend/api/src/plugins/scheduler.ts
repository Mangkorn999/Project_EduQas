import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { startScheduler } from '../scheduler'

const schedulerPlugin: FastifyPluginAsync = async (fastify) => {
  // Start the background jobs after the server is ready
  fastify.addHook('onReady', async () => {
    startScheduler()
  })
}

export default fp(schedulerPlugin, { name: 'scheduler', dependencies: ['db'] })
