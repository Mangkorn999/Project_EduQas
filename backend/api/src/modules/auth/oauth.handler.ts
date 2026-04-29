import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { db } from '../../../../db'
import { users } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { TokenService } from './token.service'
import { SessionService } from './session.service'
import { OTPService } from './otp.service'
import { authenticate } from '../../middleware/authenticate'
import { authorize } from '../../middleware/authorize'
import { createAuditLog } from '../audit/audit.service'

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
    // Generate code_verifier and state here in a real implementation
    // For now, redirect to dummy PSU Passport
    return reply.redirect('https://passport.psu.ac.th/authorize?client_id=demo&response_type=code&redirect_uri=/api/v1/auth/callback')
  })

  app.get('/callback', async (request, reply) => {
    const { code } = request.query as { code: string }
    if (!code) {
      return reply.code(400).send({ error: { code: 'validation_error', message: 'Missing code' } })
    }

    // In a real implementation: Exchange code for PSU Passport profile
    // Mock profile for demonstration:
    const profile = {
      psu_passport_id: '12345',
      email: 'student@psu.ac.th',
      name: 'Somchai Student',
      role: 'student',
      faculty_id: '00000000-0000-0000-0000-000000000001' // FALLBACK_ID
    }

    // FR-USER-02: Upsert user
    let [user] = await db.select().from(users).where(eq(users.psuPassportId, profile.psu_passport_id))
    
    if (!user) {
      [user] = await db.insert(users).values({
        psuPassportId: profile.psu_passport_id,
        email: profile.email,
        displayName: profile.name,
        role: profile.role as 'student' | 'teacher' | 'staff',
        facultyId: profile.faculty_id
      }).returning()
    } else {
      [user] = await db.update(users).set({
        email: profile.email,
        displayName: profile.name,
        lastLoginAt: new Date()
      }).where(eq(users.id, user.id)).returning()
    }

    // Note: Role overrides check would go here before issuing tokens
    const effectiveRole = user.role // Simplify for now

    // Issue tokens
    const { rawToken } = await sessionService.createSession(user.id, request.ip, request.headers['user-agent'])
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      role: effectiveRole,
      facultyId: user.facultyId,
      psuPassportId: user.psuPassportId
    })

    // Return tokens. Refresh token should ideally be in an HttpOnly cookie per design doc, but we return both for now
    // "Recommendation: keep the access token in JS memory... and the refresh token in an HttpOnly cookie"
    reply.setCookie('refreshToken', rawToken, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60
    })

    // FR-AUDIT-01: บันทึกการ login สำเร็จ เพื่อ track ว่าใครเข้าระบบเมื่อไหร่
    await createAuditLog({ userId: user.id, ip: request.ip }, 'auth.login', 'user', user.id, null, { role: effectiveRole })

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
      role: user.role, // effective role
      facultyId: user.facultyId
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
