import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyPluginAsync } from 'fastify'
import { env } from '../config/env'

const jwtPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  })
}

export default fp(jwtPlugin, { name: 'jwt' })
