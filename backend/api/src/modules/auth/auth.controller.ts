import { FastifyReply, FastifyRequest } from 'fastify'
import { fromNodeHeaders } from 'better-auth/node'
import { and, eq, sql } from 'drizzle-orm'
import { psuBetterAuth } from './better-auth'
import { faculties, roleOverrides, users } from '../../../../db/schema'
import { createAuditLog } from '../audit/audit.service'
import { TokenService } from './token.service'
import { SessionService } from './session.service'
import { OTPService } from './otp.service'
import { env } from '../../config/env'

type InternalRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'
type FacultyRecord = { id: string; code: string; nameTh: string; nameEn: string }
type UserFacultyState = {
  facultyId?: string | null
  facultyCode?: string | null
  facultyNameTh?: string | null
  facultyNameEn?: string | null
  facultySource?: string | null
}
type ResolvedFacultyState = Required<UserFacultyState>

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

function normalizeFacultyText(input: unknown): string | null {
  const raw = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ') : ''
  return raw || null
}

function normalizeFacultyCode(input: unknown): string | null {
  const raw = normalizeFacultyText(input)
  return raw ? raw.toUpperCase() : null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = normalizeFacultyText(value)
    if (normalized) return normalized
  }
  return null
}

function buildFacultySnapshot(row: {
  facultyId: string | null
  linkedFacultyCode: string | null
  linkedFacultyNameTh: string | null
  linkedFacultyNameEn: string | null
  facultyCode: string | null
  userFacultyNameTh: string | null
  userFacultyNameEn: string | null
  facultySource: string | null
}) {
  if (row.facultyId) {
    return {
      id: row.facultyId,
      code: row.linkedFacultyCode,
      nameTh: row.linkedFacultyNameTh,
      nameEn: row.linkedFacultyNameEn,
      source: row.facultySource ?? 'faculties_table',
    }
  }

  if (!row.facultyCode && !row.userFacultyNameTh && !row.userFacultyNameEn) return null

  return {
    id: null,
    code: row.facultyCode,
    nameTh: row.userFacultyNameTh,
    nameEn: row.userFacultyNameEn,
    source: row.facultySource ?? 'psu_profile',
  }
}

async function findFacultyById(app: any, facultyId: string): Promise<FacultyRecord | null> {
  const [faculty] = await app.db
    .select({ id: faculties.id, code: faculties.code, nameTh: faculties.nameTh, nameEn: faculties.nameEn })
    .from(faculties)
    .where(eq(faculties.id, facultyId))
    .limit(1)

  return faculty ?? null
}

async function findFacultyByCode(app: any, facultyCode: string): Promise<FacultyRecord | null> {
  const [faculty] = await app.db
    .select({ id: faculties.id, code: faculties.code, nameTh: faculties.nameTh, nameEn: faculties.nameEn })
    .from(faculties)
    .where(sql`upper(trim(${faculties.code})) = ${facultyCode}`)
    .limit(1)

  return faculty ?? null
}

async function findFacultyByName(app: any, facultyName: string): Promise<FacultyRecord | null> {
  const [faculty] = await app.db
    .select({ id: faculties.id, code: faculties.code, nameTh: faculties.nameTh, nameEn: faculties.nameEn })
    .from(faculties)
    .where(sql`lower(trim(${faculties.nameTh})) = lower(${facultyName}) OR lower(trim(${faculties.nameEn})) = lower(${facultyName})`)
    .limit(1)

  return faculty ?? null
}

async function resolveFacultyState(app: any, psuUser: any, currentUser?: UserFacultyState): Promise<ResolvedFacultyState> {
  const facultyIdClaim = normalizeFacultyId(psuUser?.facultyId)
  const facultyCodeClaim = normalizeFacultyCode(psuUser?.facultyCode)
  const facultyNameThClaim = firstString(psuUser?.facultyNameTh)
  const facultyNameEnClaim = firstString(psuUser?.facultyNameEn)
  const facultyNameClaim = firstString(psuUser?.facultyName, facultyNameThClaim, facultyNameEnClaim)

  if (facultyIdClaim) {
    const faculty = await findFacultyById(app, facultyIdClaim)
    if (faculty) return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'psu_faculty_id' }
  }

  if (facultyCodeClaim) {
    const faculty = await findFacultyByCode(app, facultyCodeClaim)
    if (faculty) return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'psu_faculty_code' }
  }

  for (const facultyName of [facultyNameThClaim, facultyNameEnClaim, facultyNameClaim]) {
    if (!facultyName) continue
    const faculty = await findFacultyByName(app, facultyName)
    if (faculty) return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'psu_faculty_name' }
  }

  const hasIncomingFacultyMetadata = Boolean(facultyIdClaim || facultyCodeClaim || facultyNameThClaim || facultyNameEnClaim || facultyNameClaim)
  if (hasIncomingFacultyMetadata) {
    return {
      facultyId: null,
      facultyCode: facultyCodeClaim ?? currentUser?.facultyCode ?? null,
      facultyNameTh: facultyNameThClaim ?? facultyNameClaim ?? currentUser?.facultyNameTh ?? null,
      facultyNameEn: facultyNameEnClaim ?? currentUser?.facultyNameEn ?? null,
      facultySource: 'psu_profile',
    }
  }

  if (currentUser?.facultyId || currentUser?.facultyCode || currentUser?.facultyNameTh || currentUser?.facultyNameEn) {
    return {
      facultyId: currentUser.facultyId ?? null,
      facultyCode: currentUser.facultyCode ?? null,
      facultyNameTh: currentUser.facultyNameTh ?? null,
      facultyNameEn: currentUser.facultyNameEn ?? null,
      facultySource: currentUser.facultySource ?? null,
    }
  }

  if (env.NODE_ENV !== 'production' && env.FALLBACK_FACULTY_ID) {
    const faculty = await findFacultyById(app, env.FALLBACK_FACULTY_ID)
    if (faculty) {
      console.warn('[auth] FALLBACK_FACULTY_ID was used because PSU faculty metadata could not be resolved')
      return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'fallback_faculty_id' }
    }
  }

  return { facultyId: null, facultyCode: null, facultyNameTh: null, facultyNameEn: null, facultySource: null }
}

function forwardResponseHeaders(reply: FastifyReply, res: Response) {
  for (const [key, value] of res.headers.entries()) {
    const lower = key.toLowerCase()
    if (lower === 'content-length' || lower === 'transfer-encoding' || lower === 'set-cookie') continue
    reply.header(key, value)
  }

  const getSetCookie = (res.headers as any).getSetCookie?.bind(res.headers)
  const setCookies: string[] = typeof getSetCookie === 'function' ? getSetCookie() : []
  if (Array.isArray(setCookies) && setCookies.length > 0) reply.header('set-cookie', setCookies)
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

    if (!headers.has('origin')) headers.set('origin', `${proto}://${host}`)

    const betterAuthReq = new Request(signInUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ providerId: 'psu', callbackURL: '/auth/callback', requestSignUp: true }),
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
    const session = await (psuBetterAuth as any).api.getSession({ headers: fromNodeHeaders(request.headers as any) })
    const psuUser = session?.user as any
    if (!psuUser?.psuPassportId || !psuUser.email) {
      return reply.code(401).send({ error: { code: 'unauthenticated', message: 'Missing PSU claims' } })
    }

    const psuPassportId = String(psuUser.psuPassportId)
    const derivedRole = normalizeRole(psuUser.role)
    const email = String(psuUser.email)
    const displayName = String(psuUser.name ?? email)

    let [user] = await request.server.db.select().from(users).where(eq(users.psuPassportId, psuPassportId)).limit(1)
    const resolvedFaculty = await resolveFacultyState(request.server, psuUser, user)

    const userPatch = {
      email,
      displayName,
      role: derivedRole as any,
      facultyId: resolvedFaculty.facultyId,
      facultyCode: resolvedFaculty.facultyCode,
      facultyNameTh: resolvedFaculty.facultyNameTh,
      facultyNameEn: resolvedFaculty.facultyNameEn,
      facultySource: resolvedFaculty.facultySource,
      lastLoginAt: new Date(),
    }

    if (!user) {
      ;[user] = await request.server.db.insert(users).values({ psuPassportId, ...userPatch }).returning()
    } else {
      ;[user] = await request.server.db.update(users).set(userPatch).where(eq(users.id, user.id)).returning()
    }

    const [override] = await request.server.db
      .select({ overrideRole: roleOverrides.overrideRole })
      .from(roleOverrides)
      .where(and(eq(roleOverrides.userId, user.id), sql`(${roleOverrides.expiresAt} IS NULL OR ${roleOverrides.expiresAt} > now())`))
      .limit(1)

    const effectiveRole = (override?.overrideRole ?? derivedRole) as typeof user.role
    const { rawToken } = await this.sessionService.createSession(user.id, request.ip, request.headers['user-agent'])
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      role: effectiveRole,
      facultyId: user.facultyId,
      facultyCode: user.facultyCode,
      facultyNameTh: user.facultyNameTh,
      facultyNameEn: user.facultyNameEn,
      facultySource: user.facultySource,
      psuPassportId: user.psuPassportId,
    })

    reply.setCookie('refreshToken', rawToken, { path: '/auth', httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 })
    reply.setCookie('accessToken', accessToken, { path: '/', httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 })

    await createAuditLog({ userId: user.id, ip: request.ip }, 'auth.login', 'user', user.id, null, {
      role: effectiveRole,
      facultyId: user.facultyId,
      facultySource: user.facultySource,
    })

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
        facultyCode: user.facultyCode,
        facultyNameTh: user.facultyNameTh,
        facultyNameEn: user.facultyNameEn,
        facultySource: user.facultySource,
        psuPassportId: user.psuPassportId,
      })

      reply.setCookie('refreshToken', rawToken, { path: '/auth', httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 })
      reply.setCookie('accessToken', accessToken, { path: '/', httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 })

      return { accessToken }
    } catch {
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
    const payload = request.user as { userId: string }
    const [user] = await request.server.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        facultyId: users.facultyId,
        facultyCode: users.facultyCode,
        userFacultyNameTh: users.facultyNameTh,
        userFacultyNameEn: users.facultyNameEn,
        facultySource: users.facultySource,
        linkedFacultyCode: faculties.code,
        linkedFacultyNameTh: faculties.nameTh,
        linkedFacultyNameEn: faculties.nameEn,
      })
      .from(users)
      .leftJoin(faculties, eq(users.facultyId, faculties.id))
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })

    const faculty = buildFacultySnapshot(user)

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      facultyId: user.facultyId,
      facultyNameTh: faculty?.nameTh ?? null,
      facultyNameEn: faculty?.nameEn ?? null,
      faculty,
    }
  }

  setRole = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(env.NODE_ENV === 'development' || env.ALLOW_DEV_ROLE_SWITCHING)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Role switching is disabled outside development' } })
    }

    const { role } = request.body as { role: string }
    const payload = request.user as { userId: string; role: string }
    const [updatedUser] = await request.server.db.update(users).set({ role: role as any }).where(eq(users.id, payload.userId)).returning()
    if (!updatedUser) return reply.code(404).send({ error: { code: 'not_found', message: 'User not found' } })

    const accessToken = this.tokenService.generateAccessToken({
      userId: updatedUser.id,
      role: updatedUser.role,
      facultyId: updatedUser.facultyId,
      facultyCode: updatedUser.facultyCode,
      facultyNameTh: updatedUser.facultyNameTh,
      facultyNameEn: updatedUser.facultyNameEn,
      facultySource: updatedUser.facultySource,
      psuPassportId: updatedUser.psuPassportId,
    })

    reply.setCookie('accessToken', accessToken, { path: '/', httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 })
    await createAuditLog({ userId: payload.userId, ip: request.ip }, 'auth.role_change', 'user', payload.userId, null, { previousRole: payload.role, newRole: role })

    return { success: true, role }
  }
}
