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

type InternalRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'

const FALLBACK_FACULTY_ID = '00000000-0000-0000-0000-000000000001'

const allowedRoles = new Set<InternalRole>([
  'super_admin',
  'admin',
  'executive',
  'teacher',
  'staff',
  'student',
])

function normalizeRole(input: unknown): InternalRole {
  const raw = typeof input === 'string' ? input : null
  if (!raw) return 'student'
  return (allowedRoles.has(raw as InternalRole) ? (raw as InternalRole) : 'student') satisfies InternalRole
}

function normalizeFacultyId(input: unknown): string {
  return typeof input === 'string' && input.trim() ? input : FALLBACK_FACULTY_ID
}

export default async function authRoutes(app: FastifyInstance) {
  const tokenService = new TokenService(app)
  const sessionService = new SessionService(tokenService)
  const otpService = new OTPService(sessionService)

  // NFR-SEC-05: Rate limit auth endpoints
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }

  app.get('/psu', async (request, reply) => {
    // Start PSU OAuth/OIDC sign-in via Better Auth.
    // We then complete login inside our `/auth/callback` endpoint.
    const result = await (psuBetterAuth as any).api.signInWithOAuth2({
      body: {
        providerId: 'psu',
        callbackURL: '/auth/callback',
        requestSignUp: true,
        // Prefer returning the URL so we can control redirect status ourselves.
        disableRedirect: true,
      },
    })

    const url =
      result?.data?.url ?? result?.data?.authorizationUrl ?? result?.data?.redirectTo ?? result?.url ?? result?.data

    if (typeof url !== 'string' || !url) {
      request.log.error({ result }, 'better-auth signInWithOAuth2 did not return a redirect URL')
      return reply.code(500).send({ error: { code: 'internal_error', message: 'OAuth initiation failed' } })
    }

    return reply.redirect(url)
  })

  app.get('/callback', async (request, reply) => {
    // Completion endpoint called after Better Auth finishes the OAuth callback.
    // At this point, we can read Better Auth session info to get PSU claims.
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
        error: { code: 'unauthenticated', message: 'Missing Better Auth session (PSU claims)' },
      })
    }

    const psuPassportId = String(psuUser.psuPassportId)
    const derivedRole = normalizeRole(psuUser.role)
    const derivedFacultyId = normalizeFacultyId(psuUser.facultyId)
    const email = String(psuUser.email)
    const displayName = String(psuUser.name ?? email)

    // Upsert user based on PSU identity.
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

    // FR-AUTH-PRIORITY: Resolve role with priority:
    // 1) active role_overrides
    // 2) PSU claims (derivedRole)
    // 3) fallback student (inside derivedRole normalization)
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

    // Issue tokens (role in JWT will be effectiveRole per priority rule).
    const { rawToken } = await sessionService.createSession(user.id, request.ip, request.headers['user-agent'])
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      role: effectiveRole,
      facultyId: user.facultyId,
      psuPassportId: user.psuPassportId,
    })

    // Refresh token in HttpOnly cookie.
    reply.setCookie('refreshToken', rawToken, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
    })

    await createAuditLog(
      { userId: user.id, ip: request.ip },
      'auth.login',
      'user',
      user.id,
      null,
      { role: effectiveRole },
    )

    return { accessToken }
  })

  app.post('/refresh', async (request, reply) => {
    // Read from cookie
    const oldToken = request.cookies.refreshToken
    if (!oldToken) {
      return reply.code(401).send({ error: { code: 'unauthenticated', message: 'Missing refresh token' } })
    }

    try {
      const { rawToken, session, userId } = await sessionService.rotateToken(oldToken, request.ip, request.headers['user-agent'])
      
      const [user] = await db.select().from(users).where(eq(users.id, userId))
      if (!user) throw new Error('user_not_found')

      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        role: user.role,
        facultyId: user.facultyId,
        psuPassportId: user.psuPassportId
      })

      reply.setCookie('refreshToken', rawToken, {
        path: '/api/v1/auth',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60
      })

      return { accessToken }
    } catch (err: any) {
      if (err.message === 'token_reuse') {
        return reply.code(401).send({ error: { code: 'token_reuse', message: 'Token reuse detected' } })
      }
      return reply.code(401).send({ error: { code: 'unauthenticated', message: 'Invalid refresh token' } })
    }
  })

  app.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const token = request.cookies.refreshToken
    if (token) {
      const hash = tokenService.hashRefreshToken(token)
      await sessionService.revokeToken(hash)
    }
    reply.clearCookie('refreshToken', { path: '/api/v1/auth' })
    return { success: true }
  })

  app.post('/revoke-all', { preHandler: [authenticate] }, async (request, reply) => {
    const payload = request.user as any
    await sessionService.revokeAll(payload.userId)
    reply.clearCookie('refreshToken', { path: '/api/v1/auth' })
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
      role: payload.role, // effective role (after `role_overrides`)
      facultyId: payload.facultyId,
    }
  })

  app.post(
    '/role-override/otp/request',
    { 
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: { body: z.object({ userId: z.string(), overrideRole: z.enum(['admin', 'executive', 'super_admin', 'teacher', 'staff', 'student']) }) }
    },
    async (request, reply) => {
      const { userId, overrideRole } = request.body as any
      const requester = request.user as any
      await otpService.requestRoleOverrideOTP(userId, requester.userId, overrideRole)
      return { success: true }
    }
  )

  app.post(
    '/role-override/otp/verify',
    { 
      preHandler: [authenticate, authorize(['super_admin'])],
      schema: { body: z.object({ userId: z.string(), otp: z.string(), overrideRole: z.enum(['admin', 'executive', 'super_admin', 'teacher', 'staff', 'student']), reason: z.string().optional() }) }
    },
    async (request, reply) => {
      const { userId, otp, overrideRole, reason } = request.body as any
      const requester = request.user as any
      try {
        await otpService.verifyRoleOverrideOTP(userId, requester.userId, otp, overrideRole, reason)
        // FR-AUTH-15: บันทึก role override ที่สำเร็จ เพราะเป็น action ที่มี impact สูง
        await createAuditLog({ userId: requester.userId, ip: request.ip }, 'auth.role_override', 'user', userId, null, { overrideRole, reason })
        return { success: true }
      } catch (err: any) {
        return reply.code(400).send({ error: { code: 'business_rule', message: err.message } })
      }
    }
  )
}
