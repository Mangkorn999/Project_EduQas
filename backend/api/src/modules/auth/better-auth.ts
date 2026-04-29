import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'

// Must match backend role enum (see `backend/db/schema/enums.ts`)
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
  // Better Auth needs an explicit URL for server-side sign-in initiation.
  // See `better-auth` docs: it checks BETTER_AUTH_URL / baseURL.
  baseURL: BETTER_AUTH_URL,

  // Better Auth secret (required in production).
  secret: BETTER_AUTH_SECRET,

  account: {
    // We'll read user session info via `auth.api.getSession`, but enabling this
    // keeps Better Auth flexible if it falls back to cookie-only strategies.
    storeAccountCookie: true,
  },

  advanced: {
    // Ensure Better Auth session cookie is also sent to our `/auth/callback` route.
    // Without this, cookie Path scoping can prevent `/auth/callback` from seeing session.
    cookies: {
      session_token: {
        attributes: {
          path: '/',
        },
      },
    },
    // SameSite must be 'lax' (not 'strict') because OAuth callbacks are cross-site
    // top-level GET navigations from PSU (eila.psu.ac.th) back to localhost.
    // 'strict' would cause the browser to drop OAuth state/PKCE cookies on redirect.
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
      facultyId: { type: 'string', required: false, defaultValue: FALLBACK_FACULTY_ID },
      role: { type: 'string', required: false, defaultValue: 'student' },
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
            // PSU user info shape is expected to follow repo design docs / mock.
            const psuPassportId =
              profile?.psu_passport_id ?? profile?.psuPassportId ?? profile?.sub ?? profile?.id

            const email = profile?.email
            const name = profile?.name ?? profile?.displayName ?? profile?.given_name ?? 'Unnamed PSU User'

            const role = normalizeRole(profile?.role)
            const facultyId = normalizeFacultyId(profile?.faculty_id ?? profile?.facultyId)

            return {
              id: String(psuPassportId ?? email ?? 'psu-user'),
              email,
              name,
              psuPassportId: String(psuPassportId),
              role,
              facultyId,
            }
          },
        },
      ],
    }),
  ],
})

