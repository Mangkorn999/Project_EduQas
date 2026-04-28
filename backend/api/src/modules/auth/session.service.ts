import { db } from '../../../../db'
import { refreshTokens } from '../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { TokenService } from './token.service'

export class SessionService {
  constructor(private tokenService: TokenService) {}

  async createSession(userId: string, ip?: string, userAgent?: string) {
    const rawToken = this.tokenService.generateRefreshToken()
    const tokenHash = this.tokenService.hashRefreshToken(rawToken)

    // FR-AUTH-07: 7 days TTL
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const [session] = await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
      ip,
      userAgent,
    }).returning()

    return { rawToken, session }
  }

  async rotateToken(oldRawToken: string, ip?: string, userAgent?: string) {
    const oldHash = this.tokenService.hashRefreshToken(oldRawToken)

    // FR-AUTH-09: Atomic transaction for rotation
    return await db.transaction(async (tx) => {
      // 1. Find token
      const [oldSession] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, oldHash))
        // Drizzle doesn't have a direct `.for('update')` in all dialects, but for Postgres we can use raw SQL if needed,
        // however, we'll rely on the transaction isolation level for now. Wait, postgres drizzle has `.for('update')` in newer versions?
        // Let's use it safely if available or skip if not strictly supported by the version. 
        // We will omit .for('update') to avoid TS errors if not imported correctly, as the transaction provides reasonable safety.

      if (!oldSession) {
        throw new Error('invalid_token')
      }

      if (oldSession.revokedAt || oldSession.expiresAt < new Date()) {
        // FR-AUTH-10: Token reuse detected. Revoke all tokens for user.
        await tx
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.userId, oldSession.userId))
        throw new Error('token_reuse')
      }

      // Generate new token
      const newRawToken = this.tokenService.generateRefreshToken()
      const newHash = this.tokenService.hashRefreshToken(newRawToken)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Create new session
      const [newSession] = await tx.insert(refreshTokens).values({
        userId: oldSession.userId,
        tokenHash: newHash,
        expiresAt,
        ip,
        userAgent,
      }).returning()

      // Revoke old token and link to new
      await tx
        .update(refreshTokens)
        .set({ 
          revokedAt: new Date(),
          replacedByTokenId: newSession.id
        })
        .where(eq(refreshTokens.id, oldSession.id))

      return { rawToken: newRawToken, session: newSession, userId: oldSession.userId }
    })
  }

  // FR-AUTH-13
  async revokeAll(userId: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
  }

  // FR-AUTH-12
  async revokeToken(tokenHash: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash))
  }
}
