# Changelog

## [Unreleased] — 2026-04-29

### 🐛 Fix
- Backend API default port changed from `3000` to `3001` to avoid conflict with Next.js dev server
- Root `.env.example` updated: `PORT`, `PSU_CALLBACK_URL`, `BETTER_AUTH_URL` now reference port `3001`
- Frontend API fallback URL (`web/lib/api.ts`) updated to port `3001`
- Login page PSU Passport button now points to `http://localhost:3001/auth/psu` instead of non-existent `/auth/login`
- Created `backend/api/.env.example` with correct port `3001` defaults

### 🔒 Security
- Fixed PSU OAuth `redirect_uri` mismatch: env files now use the actual Better Auth callback
  path `http://localhost:3001/api/auth/oauth2/callback/psu` instead of the incorrect `/auth/callback`
- Fixed OAuth callback cookie loss: changed `sameSite` from `strict` to `lax` in Better Auth
  and CSRF middleware so OAuth state/PKCE cookies survive cross-site redirects from PSU
