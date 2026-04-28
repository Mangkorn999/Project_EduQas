import test from 'node:test'
import assert from 'node:assert/strict'

import { buildServer, server } from './server'

test('registers frontend-critical routes under the documented API surface', async () => {
  await buildServer()

  const routeChecks = [
    ['GET', '/api/v1/users'],
    ['GET', '/api/v1/faculties'],
    ['GET', '/api/v1/templates'],
    ['POST', '/api/v1/templates/test-template/deprecate'],
    ['POST', '/api/v1/templates/test-template/clone'],
    ['POST', '/api/v1/forms/from-template/test-template'],
    ['GET', '/api/v1/notifications'],
    ['GET', '/api/v1/notifications/unread-count'],
    ['PUT', '/api/v1/notifications/test-notification/read'],
    ['PUT', '/api/v1/notifications/read-all'],
    ['POST', '/api/v1/notifications/test-notification/resend'],
    ['GET', '/api/v1/forms/test-form/responses'],
    ['GET', '/api/v1/responses/test-response'],
    ['POST', '/api/v1/responses/test-response/submit'],
    ['POST', '/api/v1/forms/test-form/close'],
    ['POST', '/api/v1/forms/test-form/duplicate'],
  ] as const

  for (const [method, url] of routeChecks) {
    const response = await server.inject({ method, url })
    assert.notEqual(response.statusCode, 404, `${method} ${url} should be registered`)
  }
})
