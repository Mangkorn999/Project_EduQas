import crypto from 'crypto'
import { FastifyInstance } from 'fastify'

export interface AccessTokenPayload {
  userId: string
  role: string
  facultyId: string | null
<<<<<<< HEAD
=======
  facultyCode?: string | null
  facultyNameTh?: string | null
  facultyNameEn?: string | null
  facultySource?: string | null
>>>>>>> feature/ux-login-role-test
  psuPassportId: string
}

export class TokenService {
  constructor(private app: FastifyInstance) {}

  generateAccessToken(payload: AccessTokenPayload): string {
    // FR-AUTH-06: 15 minutes TTL
    return this.app.jwt.sign(payload, { expiresIn: '15m' })
  }

  generateRefreshToken(): string {
    // Generate a secure random opaque token
    return crypto.randomBytes(40).toString('hex')
  }

  hashRefreshToken(token: string): string {
    // FR-AUTH-08: Hashed in DB
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.app.jwt.verify<AccessTokenPayload>(token)
  }
}
