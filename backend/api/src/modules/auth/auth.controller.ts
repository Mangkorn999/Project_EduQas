import { FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { psuBetterAuth } from './better-auth'
import { and, eq, sql } from 'drizzle-orm'
import { users, roleOverrides } from '../../../../db/schema'
import { createAuditLog } from '../audit/audit.service'
import { TokenService } from './token.service'
import { SessionService } from './session.service'
import { OTPService } from './otp.service'
import { env } from '../../config/env'

type InternalRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'
const allowedRoles = new Set<InternalRole>(['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student'])

function normalizeRole(input: unknown): InternalRole {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return 'student'
  return allowedRoles.has(raw as InternalRole) ? (raw as InternalRole) : 'student'
}

function normalizeFacultyId(input: unknown): string | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  return raw || null
}

function forwardResponseHeaders(reply: FastifyReply, res: Response) {
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

export class AuthController {
  private tokenService: TokenService
  private sessionService: SessionService
  private otpService: OTPService

  constructor(app: any) {
    this.tokenService = new TokenService(app)
    this.sessionService = new SessionService(this.tokenService)
    this.otpService = new OTPService(this.sessionService)
  }

  initiateOAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const host = request.headers.host ?? 'localhost:3001'
    const proto = (request.headers['x-forwarded-proto'] as string) ?? (request.protocol as string) ?? 'http'
    const signInUrl = new URL('/api/auth/sign-in/oauth2', `${proto}://${host}`)

    const headers = fromNodeHeaders(request.headers as any)
    headers.set('accept', 'application/json')
    headers.set('content-type', 'application/json')

    if (!headers.has('origin')) {
      headers.set('origin', `${proto}://${host}`)
    }

    const betterAuthReq = new Request(signInUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        providerId: 'psu',
        callbackURL: '/auth/callback',
        requestSignUp: true,
      }),
    })

    const res = await psuBetterAuth.handler(betterAuthReq)
    forwardResponseHeaders(reply, res)

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (location) return reply.redirect(location)
    }

    const body = await res.json()
    if (body?.url) return reply.redirect(body.url)

    return reply.code(res.status).send(body)
  }

  callback = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await (psuBetterAuth as any).api.getSession({
      headers: fromNodeHeaders(request.headers as any),
    })

    const psuUser = session?.user as any
    if (!psuUser?.psuPassportId || !psuUser.email) {
      return reply.code(401).send({ error: { code: 'unauthenticated', message: 'Missing PSU claims' } })
    }

    const psuPassportId = String(psuUser.psuPassportId)
    const derivedRole = normalizeRole(psuUser.role)
    const derivedFacultyId = normalizeFacultyId(psuUser.facultyId)
    const email = String(psuUser.email)
    const displayName = String(psuUser.name ?? email)

    let [user] = await request.server.db.select().from(users).where(eq(users.psuPassportId, psuPassportId)).limit(1)

    if (!user) {
      ;[user] = await request.server.db.insert(users).values({
        psuPassportId,
        email,
        displayName,
        role: derivedRole as any,
        facultyId: derivedFacultyId,
        lastLoginAt: new Date(),
      }).returning()
    } else {
      ;[user] = await request.server.db.update(users).set({
        email,
        displayName,
        role: derivedRole as any,
        facultyId: derivedFacultyId,
        lastLoginAt: new Date(),
      }).where(eq(users.id, user.id)).returning()
    }

    const [override] = await request.server.db.select({ overrideRole: roleOverrides.overrideRole }).from(roleOverrides)
      .where(and(eq(roleOverrides.userId, user.id), sql`(${roleOverrides.expiresAt} IS NULL OR ${roleOverrides.expiresAt} > now())`))
      .limit(1)

    const effectiveRole = (override?.overrideRole ?? derivedRole) as typeof user.role

    const { rawToken } = await this.sessionService.createSession(user.id, request.ip, request.headers['user-agent'])
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      role: effectiveRole,
      facultyId: user.facultyId,
      psuPassportId: user.psuPassportId,
    })

    reply.setCookie('refreshToken', rawToken, {
      path: '/auth',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    })

    reply.setCookie('accessToken', accessToken, {
      path: '/',
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
    })

    await createAuditLog({ userId: user.id, ip: request.ip }, 'auth.login', 'user', user.id, null, { role: effectiveRole })

    return reply.redirect(`${env.FRONTEND_URL}/callback`)
  }

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const oldToken = request.cookies.refreshToken
    if (!oldToken) return reply.code(401).send({ error: { code: 'unauthenticated', message: 'Missing refresh token' } })

    try {
      const { rawToken, userId } = await this.sessionService.rotateToken(oldToken, request.ip, request.headers['user-agent'])
      const [user] = await request.server.db.select().from(users).where(eq(users.id, userId))
      if (!user) throw new Error('user_not_found')

      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id,
        role: user.role,
        facultyId: user.facultyId,
        psuPassportId: user.psuPassportId,
      })

      reply.setCookie('refreshToken', rawToken, {
        path: '/auth',
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      })

      return { accessToken }
    } catch (err: any) {
      return reply.code(401).send({ error: { code: 'unauthenticated', message: 'Invalid refresh token' } })
    }
  }

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.refreshToken
    if (token) {
      const hash = this.tokenService.hashRefreshToken(token)
      await this.sessionService.revokeToken(hash)
    }
    reply.clearCookie('refreshToken', { path: '/auth', httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' })
    return { success: true }
  }

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as any
    const [user] = await request.server.db.select().from(users).where(eq(users.id, payload.userId))
    if (!user) return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role, facultyId: user.facultyId }
  }

  setRole = async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.body as { role: string }
    const payload = request.user as { userId: string; role: string }

    const [updatedUser] = await request.server.db.update(users).set({ role: role as any }).where(eq(users.id, payload.userId)).returning()
    if (!updatedUser) return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })

    const accessToken = this.tokenService.generateAccessToken({
      userId: updatedUser.id,
      role: updatedUser.role,
      facultyId: updatedUser.facultyId,
      psuPassportId: updatedUser.psuPassportId,
    })

    reply.setCookie('accessToken', accessToken, { path: '/', httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 })
    await createAuditLog({ userId: payload.userId, ip: request.ip }, 'auth.role_change', 'user', payload.userId, null, { previousRole: payload.role, newRole: role })

    return { success: true, role }
  }
}
