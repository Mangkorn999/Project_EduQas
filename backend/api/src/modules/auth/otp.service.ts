import crypto from 'crypto'
import { db } from '../../../../db'
import { roleOverrides, users } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { SessionService } from './session.service'
import { sendEmail } from '../notifications/email.service'

class MailService {
  async sendOTP(email: string, otp: string) {
    await sendEmail(
      email,
      'EILA role override OTP',
      `<p>Your role override OTP is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`,
    )
  }
}

export class OTPService {
  private mailService = new MailService()

  // In-memory OTP store for simplicity (FR-AUTH-20). In production, use Redis or DB.
  // 10 min TTL
  private otpStore = new Map<string, { hash: string; expiresAt: number; attempts: number }>()

  constructor(private sessionService: SessionService) {}

  async requestRoleOverrideOTP(targetUserId: string, requesterUserId: string, overrideRole: 'admin' | 'executive' | 'super_admin' | 'teacher' | 'staff' | 'student') {
    // 1. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString()
    const hash = crypto.createHash('sha256').update(otp).digest('hex')

    // 2. Store OTP with 10 min TTL
    this.otpStore.set(targetUserId, {
      hash,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    })

    // 3. Get super admin email (requester)
    const [requester] = await db.select().from(users).where(eq(users.id, requesterUserId))
    if (!requester || !requester.email) {
      throw new Error('requester_email_not_found')
    }

    // 4. Send email
    await this.mailService.sendOTP(requester.email, otp)
    return { success: true }
  }

  async verifyRoleOverrideOTP(targetUserId: string, requesterUserId: string, otp: string, overrideRole: 'admin' | 'executive' | 'super_admin' | 'teacher' | 'staff' | 'student', reason?: string) {
    const record = this.otpStore.get(targetUserId)
    if (!record) {
      throw new Error('otp_not_found_or_expired')
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(targetUserId)
      throw new Error('otp_not_found_or_expired')
    }

    if (record.attempts >= 5) {
      // 5 failures within 15 min locks the OTP
      this.otpStore.delete(targetUserId)
      throw new Error('otp_locked')
    }

    const hash = crypto.createHash('sha256').update(otp).digest('hex')
    if (record.hash !== hash) {
      record.attempts++
      throw new Error('otp_invalid')
    }

    // Valid OTP
    this.otpStore.delete(targetUserId)

    // Insert override
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1) // default 1 month override? The spec doesn't say, we'll just set it.

    await db.transaction(async (tx) => {
      await tx.insert(roleOverrides).values({
        userId: targetUserId,
        overrideRole,
        reason: reason || 'Approved via OTP',
        approvedBy: requesterUserId,
        expiresAt,
      })
    })

    // FR-AUTH-15: Revoke all target user's refresh tokens
    await this.sessionService.revokeAll(targetUserId)

    return { success: true }
  }
}
