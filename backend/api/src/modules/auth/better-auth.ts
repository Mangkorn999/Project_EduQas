import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'

type InternalRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'

const allowedRoles = new Set<InternalRole>([
  'super_admin', 'admin', 'executive', 'teacher', 'staff', 'student',
])

function normalizeRole(input: unknown): InternalRole {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (!raw) return 'student'
  return allowedRoles.has(raw as InternalRole) ? (raw as InternalRole) : 'student'
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

// ─── FIX: ตัด "คณะ..." ออกจาก office_name_th ────────────────────────────────
// PSU ส่ง office_name_th = "สาขาวิชาวิทยาศาสตร์การคำนวณ คณะวิทยาศาสตร์"
// ตัดเอาเฉพาะส่วนที่ขึ้นต้นด้วย "คณะ" → "คณะวิทยาศาสตร์"
function extractFacultyFromOffice(officeName: unknown): string | null {
  if (typeof officeName !== 'string' || !officeName.trim()) return null
  const idx = officeName.indexOf('คณะ')
  if (idx >= 0) return officeName.slice(idx).trim()
  return null
}

const PSU_CLIENT_ID     = process.env.PSU_CLIENT_ID
const PSU_CLIENT_SECRET = process.env.PSU_CLIENT_SECRET
const PSU_OPENID_URL    = process.env.PSU_OPENID_URL
const BETTER_AUTH_URL   = process.env.BETTER_AUTH_URL
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET

if (!PSU_CLIENT_ID)      throw new Error('Missing env var: PSU_CLIENT_ID')
if (!PSU_CLIENT_SECRET)  throw new Error('Missing env var: PSU_CLIENT_SECRET')
if (!PSU_OPENID_URL)     throw new Error('Missing env var: PSU_OPENID_URL')
if (!BETTER_AUTH_URL)    throw new Error('Missing env var: BETTER_AUTH_URL')
if (!BETTER_AUTH_SECRET) throw new Error('Missing env var: BETTER_AUTH_SECRET')

export const psuBetterAuth = betterAuth({
  appName: 'EILA',
  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,

  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },

  user: {
    additionalFields: {
      psuPassportId: { type: 'string', required: true },
      facultyId:     { type: 'string', required: false },
      facultyCode:   { type: 'string', required: false },
      facultyName:   { type: 'string', required: false },
      facultyNameTh: { type: 'string', required: false },
      facultyNameEn: { type: 'string', required: false },
      role:          { type: 'string', required: false, defaultValue: 'student' },
    },
  },

  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'psu',
          clientId: PSU_CLIENT_ID,
          clientSecret: PSU_CLIENT_SECRET,
          discoveryUrl: PSU_OPENID_URL,
          scopes: ['openid', 'profile', 'email', 'psu_info'],
          pkce: true,

          mapProfileToUser: (profile: any) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('[auth] RAW PSU PROFILE:', JSON.stringify(profile, null, 2))
            }

            const psuClaim = (profile?.psu ?? {}) as Record<string, unknown>

            // ── Email & Name ──────────────────────────────────────────────────
            const email = typeof profile?.email === 'string' && profile.email.trim()
              ? profile.email.trim() : ''

            const name = firstString(
              profile?.name,
              profile?.displayName,
              profile?.given_name,
            ) ?? 'Unnamed PSU User'

            // ── PSU Passport ID ───────────────────────────────────────────────
            const resolvedPassportId =
              psuClaim?.username ??          // "6610210631" ← PSU ส่งมาใน psu claim
              psuClaim?.id ??
              psuClaim?.preferred_username ??
              profile?.preferred_username ??
              profile?.sub ??
              email

            const psuPassportId = String(resolvedPassportId ?? '').trim()
            if (!psuPassportId) throw new Error('PSU profile did not contain a usable passport ID')

            // ── Role ──────────────────────────────────────────────────────────
            const groups: string[] = Array.isArray(profile?.groups) ? profile.groups : []
            const roleFromGroups = groups.find(g => allowedRoles.has(g as InternalRole))
            const role = normalizeRole(psuClaim?.role ?? profile?.role ?? roleFromGroups)

            // ── Faculty ───────────────────────────────────────────────────────
            // PSU ส่ง faculty_id = "08" (ตัวเลข ไม่ใช่ UUID)
            // → เซฟใน facultyCode เพื่อใช้ค้นหาใน faculties table ด้วย code
            // → ห้ามเซฟใน facultyId เพราะ DB ใช้ UUID
            const facultyCode = firstString(
              psuClaim?.faculty_code as string,  // ถ้ามีในอนาคต
              psuClaim?.faculty_id as string,    // "08" ← treat as code ไม่ใช่ UUID
            )

            // ตัดชื่อ "คณะ..." ออกจาก office_name_th
            // "สาขาวิชาวิทยาศาสตร์การคำนวณ คณะวิทยาศาสตร์" → "คณะวิทยาศาสตร์"
            const facultyFromOffice = extractFacultyFromOffice(psuClaim?.office_name_th)
            const deptFromOffice    = extractFacultyFromOffice(psuClaim?.office_name_en)

            const facultyNameTh = firstString(
              psuClaim?.faculty_name_th as string,
              facultyFromOffice,                  // fallback จาก office_name_th
            )
            const facultyNameEn = firstString(
              psuClaim?.faculty_name_en as string,
              deptFromOffice,
            )

            if (process.env.NODE_ENV !== 'production') {
              console.log('[auth] Resolved faculty from PSU:', {
                facultyCode,
                facultyNameTh,
                facultyNameEn,
                psuFacultyId: psuClaim?.faculty_id,   // "08"
                officeNameTh: psuClaim?.office_name_th,
              })
            }

            return {
              id: psuPassportId,
              email: email || `${psuPassportId}@psu.local`,
              name,
              psuPassportId,
              role,
              facultyId:     null,          // PSU ไม่ส่ง UUID ของเรามา — resolve ใน controller
              facultyCode,                  // "08" ← ใช้ค้นหาใน faculties table
              facultyName:   facultyNameTh,
              facultyNameTh,
              facultyNameEn,
            }
          },
        },
      ],
    }),
  ],
})