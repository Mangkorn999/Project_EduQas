import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'

// Must match backend role enum (see `backend/db/schema/enums.ts`)
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

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

const PSU_CLIENT_ID = process.env.PSU_CLIENT_ID
const PSU_CLIENT_SECRET = process.env.PSU_CLIENT_SECRET
const PSU_OPENID_URL = process.env.PSU_OPENID_URL
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET

if (!PSU_CLIENT_ID) throw new Error('Missing env var: PSU_CLIENT_ID')
if (!PSU_CLIENT_SECRET) throw new Error('Missing env var: PSU_CLIENT_SECRET')
if (!PSU_OPENID_URL) throw new Error('Missing env var: PSU_OPENID_URL')
if (!BETTER_AUTH_URL) throw new Error('Missing env var: BETTER_AUTH_URL')
if (!BETTER_AUTH_SECRET) throw new Error('Missing env var: BETTER_AUTH_SECRET')

export const psuBetterAuth = betterAuth({
  appName: 'EILA',
  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,

  // Keep the config minimal and OAuth-friendly.
  // The important part for callback flows is SameSite=Lax.
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
      facultyId: {
        type: 'string',
        required: false,
      },
      facultyCode: {
        type: 'string',
        required: false,
      },
      facultyName: {
        type: 'string',
        required: false,
      },
      facultyNameTh: {
        type: 'string',
        required: false,
      },
      facultyNameEn: {
        type: 'string',
        required: false,
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
      },
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
          scopes: ['openid', 'profile', 'email'],
          pkce: true,
          mapProfileToUser: (profile: any) => {
            const email =
              typeof profile?.email === 'string' && profile.email.trim()
                ? profile.email.trim()
                : ''

            const name =
              typeof profile?.name === 'string' && profile.name.trim()
                ? profile.name.trim()
                : typeof profile?.displayName === 'string' && profile.displayName.trim()
                  ? profile.displayName.trim()
                  : typeof profile?.given_name === 'string' && profile.given_name.trim()
                    ? profile.given_name.trim()
                    : 'Unnamed PSU User'

            const resolvedPassportId =
              profile?.psu_passport_id ??
              profile?.psuPassportId ??
              profile?.sub ??
              profile?.id ??
              email

            const psuPassportId = String(resolvedPassportId ?? '').trim()
            if (!psuPassportId) {
              throw new Error('PSU profile did not contain a usable passport ID')
            }

            const role = normalizeRole(profile?.role)
            const facultyId = normalizeFacultyId(profile?.faculty_id ?? profile?.facultyId)
            const facultyCode = firstString(
              profile?.faculty_code,
              profile?.facultyCode,
              profile?.faculty,
              profile?.department_code,
              profile?.departmentCode
            )
            const facultyName = firstString(
              profile?.faculty_name,
              profile?.facultyName,
              profile?.organization,
              profile?.department,
              profile?.division
            )
            const facultyNameTh = firstString(
              profile?.faculty_name_th,
              profile?.facultyNameTh,
              profile?.organization_th,
              profile?.department_th,
              facultyName
            )
            const facultyNameEn = firstString(
              profile?.faculty_name_en,
              profile?.facultyNameEn,
              profile?.organization_en,
              profile?.department_en
            )

            return {
              // Better Auth needs a stable unique id
              id: psuPassportId,
              email: email || `${psuPassportId}@psu.local`,
              name,
              psuPassportId,
              role,
              facultyId,
              facultyCode,
              facultyName,
              facultyNameTh,
              facultyNameEn,
            }
          },
        },
      ],
    }),
  ],
})
