import 'dotenv/config'
import { buildApp } from './app'
import { env } from './config/env'

async function start() {
  const app = await buildApp({
    logger: true,
    genReqId: () => crypto.randomUUID(),
  })

  try {
    const port = env.PORT
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 Server is listening on port ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
