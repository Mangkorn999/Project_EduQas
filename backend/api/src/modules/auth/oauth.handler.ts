import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../../../../db'
import { roleOverrides, users } from '../../../../db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { TokenService } from './token.service'
import { SessionService } from './session.service'
import { OTPService } from './otp.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { createAuditLog } from '../audit/audit.service'
import { fromNodeHeaders } from 'better-auth/node'
import { psuBetterAuth } from './better-auth'

type InternalRole =
  | 'super_admin'
  | 'admin'
  | 'executive'
  | 'teacher'
  | 'staff'
  | 'student'

const allowedRoles = new Set<InternalRole>([
  'super_admin',
  'admin',
  'executive',
  'teacher',
  'staff',
  'student',
])

function normalizeRole(input: unknown): InternalRole {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return 'student'
  return allowedRoles.has(raw as InternalRole) ? (raw as InternalRole) : 'student'
}

function normalizeFacultyId(input: unknown): string | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  return raw || null
}

function forwardResponseHeaders(reply: any, res: Response) {
  for (const [key, value] of res.headers.entries()) {
    const lower = key.toLowerCase()
    if (lower === 'content-length' || lower === 'transfer-encoding' || lower === 'set-cookie') {
      continue
    }
    reply.header(key, value)
  }

  const getSetCookie = (res.headers as any).getSetCookie?.bind(res.headers)
  const setCookies: string[] = typeof getSetCookie === 'function' ? getSetCookie() : []
  if (Array.isArray(setCookies) && setCookies.length > 0) {
    reply.header('set-cookie', setCookies)
  }
}

function buildBetterAuthRequest(request: any) {
  const host = request.headers.host ?? 'localhost:3001'
  const proto =
    (request.headers['x-forwarded-proto'] as string | undefined) ??
    (request.protocol as string | undefined) ??
    'http'

  const signInUrl = new URL('/api/auth/sign-in/oauth2', `${proto}://${host}`)

  const headers = fromNodeHeaders(request.headers as any)
  headers.set('accept', 'application/json')
  headers.set('content-type', 'application/json')

  // Synthesize Origin for CSRF protection if missing.
  // We are converting an incoming browser GET into a backend POST.
  if (!headers.has('origin')) {
    headers.set('origin', `${proto}://${host}`)
  }

  return new Request(signInUrl.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      providerId: 'psu',
      callbackURL: '/auth/callback',
      requestSignUp: true,
    }),
  })
}

async function extractRedirectUrl(res: Response): Promise<string | null> {
  const location = res.headers.get('location')
  if (location && res.status >= 300 && res.status < 400) {
    return location
  }

  const contentType = res.headers.get('content-type') ?? ''

  // Read from a clone so the original response body stays usable later.
  const rawBody = await res.clone().text()
  if (!rawBody) return null

  if (contentType.includes('application/json')) {
    try {
      const body = JSON.parse(rawBody)
      const redirectUrl = body?.url ?? body?.data?.url
      if (typeof redirectUrl === 'string' && redirectUrl.trim()) {
        return redirectUrl.trim()
      }
    } catch {
      return null
    }
  }

  return null
}

export default async function authRoutes(app: FastifyInstance) {
  const tokenService = new TokenService(app)
  const sessionService = new SessionService(tokenService)
  const otpService = new OTPService(sessionService)

  app.get('/psu', async (request, reply) => {
    try {
      const req = buildBetterAuthRequest(request)
      const res = await psuBetterAuth.handler(req)

      forwardResponseHeaders(reply, res)

      const redirectUrl = await extractRedirectUrl(res)

      // If Better Auth already returned a redirect, preserve it.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (location) {
          reply.status(res.status)
          return reply.redirect(location)
        }

        const bodyText = await res.text()
        return reply.code(res.status).send(bodyText)
      }

      // Better Auth often returns 200 + JSON { url, redirect: true }.
      if (redirectUrl) {
        return reply.redirect(redirectUrl)
      }

      // Surface unexpected responses as-is for easier debugging.
      const contentType = res.headers.get('content-type') ?? 'text/plain'
      const bodyText = await res.text()

      request.log.error(
        {
          status: res.status,
          contentType,
          bodyText,
        },
        'OAuth initiation failed: better-auth returned an unexpected response',
      )

      return reply.code(res.status >= 400 ? res.status : 500).type(contentType).send(bodyText)
    } catch (error: any) {
      request.log.error(
        { err: error, stack: error?.stack },
        'OAuth initiation failed with exception',
      )

      return reply.code(500).send({
        error: {
          code: 'internal_error',
          message: 'OAuth initiation failed: ' + (error?.message || String(error)),
        },
      })
    }
  })

  app.get('/callback', async (request, reply) => {
    try {
      const session = await (psuBetterAuth as any).api.getSession({
        headers: fromNodeHeaders(request.headers as any),
      })

      const psuUser = session?.user as
        | {
            psuPassportId?: string
            facultyId?: string
            role?: string
            email?: string
            name?: string
          }
        | undefined

      if (!psuUser?.psuPassportId || !psuUser.email) {
        return reply.code(401).send({
          error: {
            code: 'unauthenticated',
            message: 'Missing Better Auth session (PSU claims)',
          },
        })
      }

      const psuPassportId = String(psuUser.psuPassportId)
      const derivedRole = normalizeRole(psuUser.role)
      const derivedFacultyId = normalizeFacultyId(psuUser.facultyId)
      const email = String(psuUser.email)
      const displayName = String(psuUser.name ?? email)

      let [user] = await db.select().from(users).where(eq(users.psuPassportId, psuPassportId)).limit(1)

      if (!user) {
        ;[user] = await db
          .insert(users)
          .values({
            psuPassportId,
            email,
            displayName,
            role: derivedRole as any,
            facultyId: derivedFacultyId,
            lastLoginAt: new Date(),
          })
          .returning()
      } else {
        ;[user] = await db
          .update(users)
          .set({
            email,
            displayName,
            role: derivedRole as any,
            facultyId: derivedFacultyId,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning()
      }

      const [override] = await db
        .select({ overrideRole: roleOverrides.overrideRole })
        .from(roleOverrides)
        .where(
          and(
            eq(roleOverrides.userId, user.id),
            sql`(${roleOverrides.expiresAt} IS NULL OR ${roleOverrides.expiresAt} > now())`,
          ),
        )
        .limit(1)

      const effectiveRole = (override?.overrideRole ?? derivedRole) as typeof user.role

      const { rawToken } = await sessionService.createSession(
        user.id,
        request.ip,
        request.headers['user-agent'],
      )

      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        role: effectiveRole,
        facultyId: user.facultyId,
        psuPassportId: user.psuPassportId,
      })

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

      // Set refreshToken cookie - MUST match route prefix (/auth) for browser to send it on /auth/me calls
      reply.setCookie('refreshToken', rawToken, {
        path: '/auth', // Critical: matches Fastify route prefix in server.ts (line 128)
        httpOnly: true, // JS cannot read - XSS proof
        secure: process.env.NODE_ENV === 'production', // Send over HTTPS only in prod
        sameSite: 'lax', // Allow cross-site on top-level nav (OAuth redirect), block CSRF
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      })

      // accessToken for API auth - path '/' for all routes
      reply.setCookie('accessToken', accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60, // 15 minutes
      })

      await createAuditLog(
        { userId: user.id, ip: request.ip },
        'auth.login',
        'user',
        user.id,
        null,
        { role: effectiveRole },
      )

      return reply.redirect(`${frontendUrl}/callback`)
    } catch (error: any) {
      request.log.error(
        { err: error, stack: error?.stack },
        'OAuth callback failed with exception',
      )

      return reply.code(500).send({
        error: {
          code: 'internal_error',
          message: 'OAuth callback failed: ' + (error?.message || String(error)),
        },
      })
    }
  })

  app.post('/refresh', async (request, reply) => {
    const oldToken = request.cookies.refreshToken
    if (!oldToken) {
      return reply.code(401).send({
        error: { code: 'unauthenticated', message: 'Missing refresh token' },
      })
    }

    try {
      const { rawToken, userId } = await sessionService.rotateToken(
        oldToken,
        request.ip,
        request.headers['user-agent'],
      )

      const [user] = await db.select().from(users).where(eq(users.id, userId))
      if (!user) throw new Error('user_not_found')

      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        role: user.role,
        facultyId: user.facultyId,
        psuPassportId: user.psuPassportId,
      })

      reply.setCookie('refreshToken', rawToken, {
        path: '/auth', // Match route prefix
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Consistent with login callback
        maxAge: 7 * 24 * 60 * 60,
      })

      return { accessToken }
    } catch (err: any) {
      if (err.message === 'token_reuse') {
        return reply.code(401).send({
          error: { code: 'token_reuse', message: 'Token reuse detected' },
        })
      }
      return reply.code(401).send({
        error: { code: 'unauthenticated', message: 'Invalid refresh token' },
      })
    }
  })

  app.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const token = request.cookies.refreshToken
    if (token) {
      const hash = tokenService.hashRefreshToken(token)
      await sessionService.revokeToken(hash)
    }
    reply.clearCookie('refreshToken', { path: '/auth' })
    return { success: true }
  })

  app.post('/revoke-all', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = request.user as any
    await sessionService.revokeAll(payload.userId)
    reply.clearCookie('refreshToken', { path: '/auth' })
    return { success: true }
  })

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = request.user as any
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId))
    if (!user) {
      return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: payload.role,
      facultyId: payload.facultyId,
    }
  })

  app.post(
    '/role-override/otp/request',
    {
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: {
        body: z.object({
          userId: z.string(),
          overrideRole: z.enum([
            'admin',
            'executive',
            'super_admin',
            'teacher',
            'staff',
            'student',
          ]),
        }),
      },
    },
    async (request, reply) => {
      const { userId, overrideRole } = request.body as any
      const requester = request.user as any
      await otpService.requestRoleOverrideOTP(userId, requester.userId, overrideRole)
      return { success: true }
    },
  )

  app.post(
    '/role-override/otp/verify',
    {
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: {
        body: z.object({
          userId: z.string(),
          otp: z.string(),
          overrideRole: z.enum([
            'admin',
            'executive',
            'super_admin',
            'teacher',
            'staff',
            'student',
          ]),
          reason: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { userId, otp, overrideRole, reason } = request.body as any
      const requester = request.user as any
      try {
        await otpService.verifyRoleOverrideOTP(
          userId,
          requester.userId,
          otp,
          overrideRole,
          reason,
        )
        await createAuditLog(
          { userId: requester.userId, ip: request.ip },
          'auth.role_override',
          'user',
          userId,
          null,
          { overrideRole, reason },
        )
        return { success: true }
      } catch (err: any) {
        return reply.code(400).send({
          error: { code: 'business_rule', message: err.message },
        })
      }
    },
  )

  // Simple role switcher for development/testing
  // Production should use OTP flow above
  app.post(
    '/set-role',
    {
      preHandler: [authenticate],
      schema: {
        body: z.object({
          role: z.enum(['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student']),
        }),
      },
    },
    async (request, reply) => {
      const { role } = request.body as { role: string }
      const payload = request.user as { userId: string; role: string }

      // Update user role in DB
      const [updatedUser] = await db
        .update(users)
        .set({ role: role as any })
        .where(eq(users.id, payload.userId))
        .returning()

      if (!updatedUser) {
        return reply.code(404).send({
          error: { code: 'not_found', message: 'User not found' },
        })
      }

      await createAuditLog(
        { userId: payload.userId, ip: request.ip },
        'auth.role_change',
        'user',
        payload.userId,
        null,
        { previousRole: payload.role, newRole: role },
      )

      return { success: true, role }
    },
  )
}
