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

// ─── Types ────────────────────────────────────────────────────────────────────

type InternalRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'

type FacultyRecord = {
  id: string
  code: string
  nameTh: string
  nameEn: string
}

type UserFacultyState = {
  facultyId?: string | null
  facultyCode?: string | null
  facultyNameTh?: string | null
  facultyNameEn?: string | null
  facultySource?: string | null
}

type ResolvedFacultyState = Required<UserFacultyState>

// ─── Constants ────────────────────────────────────────────────────────────────

const allowedRoles = new Set<InternalRole>([
  'super_admin', 'admin', 'executive', 'teacher', 'staff', 'student',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── FIX: ป้องกัน PostgreSQL error: invalid input syntax for type uuid ────────
// PSU ส่ง faculty_id = "08" (ตัวเลข ไม่ใช่ UUID) → ห้ามเอาไป query WHERE id = '08'
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function normalizeClaimKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function stringifyClaimValue(value: unknown, preferredKeys: string[] = []): string | null {
  const direct = normalizeFacultyText(value)
  if (direct) return direct
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = stringifyClaimValue(item, preferredKeys)
      if (resolved) return resolved
    }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of preferredKeys) {
      const resolved = stringifyClaimValue(record[key], preferredKeys)
      if (resolved) return resolved
    }
  }
  return null
}

function firstProfileClaim(
  profile: unknown,
  aliases: string[],
  preferredKeys: string[] = [],
): string | null {
  const aliasSet = new Set(aliases.map(normalizeClaimKey))
  const seen = new Set<unknown>()

  function visit(value: unknown, depth: number): string | null {
    if (!value || typeof value !== 'object' || depth > 4 || seen.has(value)) return null
    seen.add(value)
    if (Array.isArray(value)) {
      for (const item of value) {
        const resolved = visit(item, depth + 1)
        if (resolved) return resolved
      }
      return null
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (aliasSet.has(normalizeClaimKey(key))) {
        const resolved = stringifyClaimValue(child, preferredKeys)
        if (resolved) return resolved
      }
    }
    for (const child of Object.values(value as Record<string, unknown>)) {
      const resolved = visit(child, depth + 1)
      if (resolved) return resolved
    }
    return null
  }

  return visit(profile, 0)
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

async function findFacultyById(app: any, facultyId: string): Promise<FacultyRecord | null> {
  const [faculty] = await app.db
    .select({
      id:     faculties.id,
      code:   faculties.code,
      nameTh: faculties.nameTh,
      nameEn: faculties.nameEn,
    })
    .from(faculties)
    .where(eq(faculties.id, facultyId))
    .limit(1)
  return faculty ?? null
}

async function findFacultyByCode(app: any, facultyCode: string): Promise<FacultyRecord | null> {
  const [faculty] = await app.db
    .select({
      id:     faculties.id,
      code:   faculties.code,
      nameTh: faculties.nameTh,
      nameEn: faculties.nameEn,
    })
    .from(faculties)
    .where(sql`upper(trim(${faculties.code})) = ${facultyCode.toUpperCase()}`)
    .limit(1)
  return faculty ?? null
}

async function findFacultyByName(app: any, facultyName: string): Promise<FacultyRecord | null> {
  const [faculty] = await app.db
    .select({
      id:     faculties.id,
      code:   faculties.code,
      nameTh: faculties.nameTh,
      nameEn: faculties.nameEn,
    })
    .from(faculties)
    .where(
      sql`lower(trim(${faculties.nameTh})) = lower(${facultyName})
       OR lower(trim(${faculties.nameEn})) = lower(${facultyName})`,
    )
    .limit(1)
  return faculty ?? null
}

// ─── Debug Logger ─────────────────────────────────────────────────────────────

function debugFacultyLog(label: string, psuUser: any, resolved: ResolvedFacultyState) {
  if (env.NODE_ENV === 'production') return
  console.log(`[auth:${label}] psuUser keys:`, Object.keys(psuUser ?? {}))
  console.log(`[auth:${label}] psuUser raw faculty fields:`, {
    facultyId:     psuUser?.facultyId,
    facultyCode:   psuUser?.facultyCode,
    facultyNameTh: psuUser?.facultyNameTh,
    facultyNameEn: psuUser?.facultyNameEn,
    role:          psuUser?.role,
  })
  console.log(`[auth:${label}] resolved faculty:`, resolved)
}

// ─── Faculty Resolver ─────────────────────────────────────────────────────────

async function resolveFacultyState(
  app: any,
  psuUser: any,
  currentUser?: UserFacultyState,
): Promise<ResolvedFacultyState> {

  // อ่าน fields ที่ mapProfileToUser map ไว้แล้วใน session.user
  const directFacultyId   = normalizeFacultyId(psuUser?.facultyId)
  const directFacultyCode = normalizeFacultyCode(psuUser?.facultyCode)
  const directNameTh      = normalizeFacultyText(psuUser?.facultyNameTh ?? psuUser?.facultyName)
  const directNameEn      = normalizeFacultyText(psuUser?.facultyNameEn)

  // ─── FIX: ตรวจสอบ UUID ก่อนทุกครั้ง ─────────────────────────────────────
  // PSU ส่ง faculty_id = "08" (ไม่ใช่ UUID) → ถ้าเอาไป WHERE id = '08' จะ 500 ทันที
  if (directFacultyId) {
    if (isUUID(directFacultyId)) {
      // เป็น UUID จริง → ค้นหาด้วย id
      const faculty = await findFacultyById(app, directFacultyId)
      if (faculty) {
        return {
          facultyId:     faculty.id,
          facultyCode:   faculty.code,
          facultyNameTh: faculty.nameTh,
          facultyNameEn: faculty.nameEn,
          facultySource: 'psu_faculty_id',
        }
      }
    } else {
      // ไม่ใช่ UUID เช่น "08" → treat เป็น code แล้วค้นหาด้วย code แทน
      const faculty = await findFacultyByCode(app, directFacultyId)
      if (faculty) {
        return {
          facultyId:     faculty.id,
          facultyCode:   faculty.code,
          facultyNameTh: faculty.nameTh,
          facultyNameEn: faculty.nameEn,
          facultySource: 'psu_faculty_code',
        }
      }
    }
  }

  if (directFacultyCode) {
    const faculty = await findFacultyByCode(app, directFacultyCode)
    if (faculty) {
      return {
        facultyId:     faculty.id,
        facultyCode:   faculty.code,
        facultyNameTh: faculty.nameTh,
        facultyNameEn: faculty.nameEn,
        facultySource: 'psu_faculty_code',
      }
    }
  }

  for (const name of [directNameTh, directNameEn]) {
    if (!name) continue
    const faculty = await findFacultyByName(app, name)
    if (faculty) {
      return {
        facultyId:     faculty.id,
        facultyCode:   faculty.code,
        facultyNameTh: faculty.nameTh,
        facultyNameEn: faculty.nameEn,
        facultySource: 'psu_faculty_name',
      }
    }
  }

  // ─── Fallback: deep scan ───────────────────────────────────────────────────
  const facultyIdClaim = normalizeFacultyId(firstProfileClaim(psuUser, [
    'faculty_id', 'facultyId', 'fac_id', 'facId', 'facultyID',
    'department_id', 'departmentId', 'organization_id', 'organizationId',
  ], ['id', 'value']))

  const facultyCodeClaim = normalizeFacultyCode(firstProfileClaim(psuUser, [
    'faculty_code', 'facultyCode', 'fac_code', 'facCode',
    'department_code', 'departmentCode', 'organization_code',
  ], ['code', 'value']))

  const facultyNameClaim = firstString(firstProfileClaim(psuUser, [
    'faculty', 'faculty_name', 'facultyName', 'fac_name',
    'organization', 'organization_name', 'department', 'department_name',
  ], ['nameTh', 'name_th', 'name', 'label', 'value']))

  const facultyNameThClaim = firstString(
    firstProfileClaim(psuUser, [
      'faculty_name_th', 'facultyNameTh', 'fac_name_th',
      'thaiFacultyName', 'facultyThaiName',
    ], ['nameTh', 'name_th', 'thaiName', 'name', 'label', 'value']),
    facultyNameClaim,
  )

  const facultyNameEnClaim = firstString(firstProfileClaim(psuUser, [
    'faculty_name_en', 'facultyNameEn', 'fac_name_en',
    'englishFacultyName', 'facultyEnglishName',
  ], ['nameEn', 'name_en', 'englishName', 'name', 'label', 'value']))

  if (facultyIdClaim) {
    if (isUUID(facultyIdClaim)) {
      const faculty = await findFacultyById(app, facultyIdClaim)
      if (faculty) return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'psu_faculty_id' }
    } else {
      const faculty = await findFacultyByCode(app, facultyIdClaim)
      if (faculty) return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'psu_faculty_code' }
    }
  }

  if (facultyCodeClaim) {
    const faculty = await findFacultyByCode(app, facultyCodeClaim)
    if (faculty) return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'psu_faculty_code' }
  }

  for (const name of [facultyNameThClaim, facultyNameEnClaim]) {
    if (!name) continue
    const faculty = await findFacultyByName(app, name)
    if (faculty) return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'psu_faculty_name' }
  }

  // ─── ถ้า PSU ส่งข้อมูลมาบ้าง แต่หาใน faculties table ไม่เจอ ───────────────
  const hasIncomingFacultyMetadata = Boolean(
    directFacultyId || directFacultyCode || directNameTh || directNameEn ||
    facultyIdClaim  || facultyCodeClaim  || facultyNameThClaim || facultyNameEnClaim,
  )

  if (hasIncomingFacultyMetadata) {
    return {
      facultyId:     null,
      facultyCode:   directFacultyCode ?? facultyCodeClaim ?? directFacultyId ?? facultyIdClaim ?? null,
      facultyNameTh: directNameTh ?? facultyNameThClaim ?? null,
      facultyNameEn: directNameEn ?? facultyNameEnClaim ?? null,
      facultySource: 'psu_profile',
    }
  }

  // ─── ถ้า PSU ไม่ส่งข้อมูล faculty มาเลย → ใช้ค่าเดิมจาก DB ──────────────
  if (currentUser?.facultyId || currentUser?.facultyCode || currentUser?.facultyNameTh) {
    return {
      facultyId:     currentUser.facultyId     ?? null,
      facultyCode:   currentUser.facultyCode   ?? null,
      facultyNameTh: currentUser.facultyNameTh ?? null,
      facultyNameEn: currentUser.facultyNameEn ?? null,
      facultySource: currentUser.facultySource ?? null,
    }
  }

  // ─── Dev fallback ─────────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'production' && env.FALLBACK_FACULTY_ID) {
    const fid = env.FALLBACK_FACULTY_ID
    const faculty = isUUID(fid)
      ? await findFacultyById(app, fid)
      : await findFacultyByCode(app, fid.toUpperCase())
    if (faculty) {
      console.warn('[auth] FALLBACK_FACULTY_ID was used — PSU faculty metadata could not be resolved')
      return { facultyId: faculty.id, facultyCode: faculty.code, facultyNameTh: faculty.nameTh, facultyNameEn: faculty.nameEn, facultySource: 'fallback_faculty_id' }
    }
  }

  return { facultyId: null, facultyCode: null, facultyNameTh: null, facultyNameEn: null, facultySource: null }
}

// ─── Faculty Snapshot (for /me endpoint) ─────────────────────────────────────

function buildFacultySnapshot(row: {
  facultyId:           string | null
  linkedFacultyCode:   string | null
  linkedFacultyNameTh: string | null
  linkedFacultyNameEn: string | null
  facultyCode:         string | null
  userFacultyNameTh:   string | null
  userFacultyNameEn:   string | null
  facultySource:       string | null
}) {
  if (row.facultyId) {
    return {
      id:     row.facultyId,
      code:   row.linkedFacultyCode,
      nameTh: row.linkedFacultyNameTh,
      nameEn: row.linkedFacultyNameEn,
      source: row.facultySource ?? 'faculties_table',
    }
  }
  if (!row.facultyCode && !row.userFacultyNameTh && !row.userFacultyNameEn) return null
  return {
    id:     null,
    code:   row.facultyCode,
    nameTh: row.userFacultyNameTh,
    nameEn: row.userFacultyNameEn,
    source: row.facultySource ?? 'psu_profile',
  }
}

// ─── Response Header Helper ───────────────────────────────────────────────────

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

// ─── AuthController ───────────────────────────────────────────────────────────

export class AuthController {
  private tokenService: TokenService
  private sessionService: SessionService
  private otpService: OTPService

  constructor(app: any) {
    this.tokenService   = new TokenService(app)
    this.sessionService = new SessionService(this.tokenService)
    this.otpService     = new OTPService(this.sessionService)
  }

  // ── initiateOAuth ────────────────────────────────────────────────────────────

  initiateOAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const host  = request.headers.host ?? 'localhost:3001'
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

  // ── callback ─────────────────────────────────────────────────────────────────

  callback = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await (psuBetterAuth as any).api.getSession({
        headers: fromNodeHeaders(request.headers as any),
      })
      const psuUser = session?.user as any

      if (!psuUser?.psuPassportId || !psuUser.email) {
        return reply.code(401).send({
          error: { code: 'unauthenticated', message: 'Missing PSU claims' },
        })
      }

      const psuPassportId = String(psuUser.psuPassportId)
      const derivedRole   = normalizeRole(psuUser.role)
      const email         = String(psuUser.email)
      const displayName   = String(psuUser.name ?? email)

      // ดึง user เดิมจาก DB (ถ้ามี) เพื่อใช้เป็น fallback
      let [user] = await request.server.db
        .select()
        .from(users)
        .where(eq(users.psuPassportId, psuPassportId))
        .limit(1)

      // Resolve faculty โดยส่ง user เดิมเป็น fallback
      const resolvedFaculty = await resolveFacultyState(request.server, psuUser, user)

      // Debug log (dev only)
      debugFacultyLog('callback', psuUser, resolvedFaculty)

      // ─── FIX: ไม่ overwrite ด้วย null — ใช้ค่าเดิมจาก DB เป็น fallback ───
      const userPatch = {
        email,
        displayName,
        role:          derivedRole as any,
        facultyId:     resolvedFaculty.facultyId     ?? user?.facultyId     ?? null,
        facultyCode:   resolvedFaculty.facultyCode   ?? user?.facultyCode   ?? null,
        facultyNameTh: resolvedFaculty.facultyNameTh ?? user?.facultyNameTh ?? null,
        facultyNameEn: resolvedFaculty.facultyNameEn ?? user?.facultyNameEn ?? null,
        facultySource: resolvedFaculty.facultySource ?? user?.facultySource ?? null,
        lastLoginAt:   new Date(),
      }

      if (!user) {
        ;[user] = await request.server.db
          .insert(users)
          .values({ psuPassportId, ...userPatch })
          .returning()
      } else {
        ;[user] = await request.server.db
          .update(users)
          .set(userPatch)
          .where(eq(users.id, user.id))
          .returning()
      }

      // ตรวจสอบ role override
      const [override] = await request.server.db
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

      // สร้าง session และ tokens
      const { rawToken } = await this.sessionService.createSession(
        user.id,
        request.ip,
        request.headers['user-agent'],
      )

      const accessToken = this.tokenService.generateAccessToken({
        userId:        user.id,
        role:          effectiveRole,
        facultyId:     user.facultyId,
        facultyCode:   user.facultyCode,
        facultyNameTh: user.facultyNameTh,
        facultyNameEn: user.facultyNameEn,
        facultySource: user.facultySource,
        psuPassportId: user.psuPassportId,
      })

      reply.setCookie('refreshToken', rawToken, {
        path:     '/auth',
        httpOnly: true,
        secure:   env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   7 * 24 * 60 * 60,
      })
      reply.setCookie('accessToken', accessToken, {
        path:     '/',
        httpOnly: true,
        secure:   env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   15 * 60,
      })

      await createAuditLog(
        { userId: user.id, ip: request.ip },
        'auth.login', 'user', user.id, null,
        { role: effectiveRole, facultyId: user.facultyId, facultySource: user.facultySource },
      )

      return reply.redirect(`${env.FRONTEND_URL}/callback`)

    } catch (err) {
      console.error('❌ AUTH CALLBACK ERROR:', err)
      return reply.code(500).send({
        error: { code: 'internal_error', message: String(err) },
      })
    }
  }

  // ── refresh ───────────────────────────────────────────────────────────────────

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const oldToken = request.cookies.refreshToken
    if (!oldToken) {
      return reply.code(401).send({
        error: { code: 'unauthenticated', message: 'Missing refresh token' },
      })
    }

    try {
      const { rawToken, userId } = await this.sessionService.rotateToken(
        oldToken,
        request.ip,
        request.headers['user-agent'],
      )

      const [user] = await request.server.db
        .select()
        .from(users)
        .where(eq(users.id, userId))

      if (!user) throw new Error('user_not_found')

      const [override] = await request.server.db
        .select({ overrideRole: roleOverrides.overrideRole })
        .from(roleOverrides)
        .where(
          and(
            eq(roleOverrides.userId, user.id),
            sql`(${roleOverrides.expiresAt} IS NULL OR ${roleOverrides.expiresAt} > now())`,
          ),
        )
        .limit(1)

      const effectiveRole = (override?.overrideRole ?? user.role) as typeof user.role

      const accessToken = this.tokenService.generateAccessToken({
        userId:        user.id,
        role:          effectiveRole,
        facultyId:     user.facultyId,
        facultyCode:   user.facultyCode,
        facultyNameTh: user.facultyNameTh,
        facultyNameEn: user.facultyNameEn,
        facultySource: user.facultySource,
        psuPassportId: user.psuPassportId,
      })

      reply.setCookie('refreshToken', rawToken, {
        path:     '/auth',
        httpOnly: true,
        secure:   env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   7 * 24 * 60 * 60,
      })
      reply.setCookie('accessToken', accessToken, {
        path:     '/',
        httpOnly: true,
        secure:   env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   15 * 60,
      })

      return { accessToken }

    } catch {
      return reply.code(401).send({
        error: { code: 'unauthenticated', message: 'Invalid refresh token' },
      })
    }
  }

  // ── logout ────────────────────────────────────────────────────────────────────

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.refreshToken
    if (token) {
      const hash = this.tokenService.hashRefreshToken(token)
      await this.sessionService.revokeToken(hash)
    }

    reply.clearCookie('refreshToken', {
      path:     '/auth',
      httpOnly: true,
      secure:   env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    reply.clearCookie('accessToken', {
      path:     '/',
      httpOnly: true,
      secure:   env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    return { success: true }
  }

  // ── me ────────────────────────────────────────────────────────────────────────

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = request.user as { userId: string }

    const [user] = await request.server.db
      .select({
        id:                  users.id,
        email:               users.email,
        displayName:         users.displayName,
        role:                users.role,
        facultyId:           users.facultyId,
        facultyCode:         users.facultyCode,
        userFacultyNameTh:   users.facultyNameTh,
        userFacultyNameEn:   users.facultyNameEn,
        facultySource:       users.facultySource,
        linkedFacultyCode:   faculties.code,
        linkedFacultyNameTh: faculties.nameTh,
        linkedFacultyNameEn: faculties.nameEn,
      })
      .from(users)
      .leftJoin(faculties, eq(users.facultyId, faculties.id))
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) {
      return reply.code(404).send({
        error: { code: 'not_found', message: 'User not found' },
      })
    }

    const faculty = buildFacultySnapshot(user)

    return {
      id:           user.id,
      email:        user.email,
      displayName:  user.displayName,
      role:         user.role,
      facultyId:    user.facultyId,
      facultyNameTh: faculty?.nameTh ?? null,
      facultyNameEn: faculty?.nameEn ?? null,
      faculty,
    }
  }

  // ── setRole (dev only) ────────────────────────────────────────────────────────

  setRole = async (request: FastifyRequest, reply: FastifyReply) => {
    if (env.NODE_ENV !== 'development') {
      return reply.code(403).send({
        error: { code: 'forbidden', message: 'Role switching is disabled outside development' },
      })
    }

    const { role }  = request.body as { role: string }
    const payload   = request.user as { userId: string; role: string }

    const [updatedUser] = await request.server.db
      .update(users)
      .set({ role: role as any })
      .where(eq(users.id, payload.userId))
      .returning()

    if (!updatedUser) {
      return reply.code(404).send({
        error: { code: 'not_found', message: 'User not found' },
      })
    }

    const accessToken = this.tokenService.generateAccessToken({
      userId:        updatedUser.id,
      role:          updatedUser.role,
      facultyId:     updatedUser.facultyId,
      facultyCode:   updatedUser.facultyCode,
      facultyNameTh: updatedUser.facultyNameTh,
      facultyNameEn: updatedUser.facultyNameEn,
      facultySource: updatedUser.facultySource,
      psuPassportId: updatedUser.psuPassportId,
    })

    reply.setCookie('accessToken', accessToken, {
      path:     '/',
      httpOnly: true,
      secure:   false,
      sameSite: 'lax',
      maxAge:   15 * 60,
    })

    await createAuditLog(
      { userId: payload.userId, ip: request.ip },
      'auth.role_change', 'user', payload.userId, null,
      { previousRole: payload.role, newRole: role },
    )

    return { success: true, role }
  }
}
