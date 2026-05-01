import cron from 'node-cron'
import { db } from '../../../../db'
import { notificationLog, notifications, users } from '../../../../db/schema'
import { eq, and, inArray, isNull, lt } from 'drizzle-orm'
import { emailQueueEmitter } from './notifications.service'
import { sendEmail } from './email.service'

/**
 * FR-NOTIF-13: Email Retry Service
 * รองรับการพยายามส่งซ้ำ 3 ครั้ง (1m, 5m, 15m)
 */
export class EmailRetryService {
  constructor() {
    // 1. Listen for immediate send events from NotificationsService
    emailQueueEmitter.on('enqueue', (logId: string) => {
      this.processEmail(logId).catch(err => {
        console.error(`[retry-service] Failed to process immediate email ${logId}:`, err)
      })
    })

    // 2. Schedule retry cron job (Runs every minute)
    cron.schedule('* * * * *', () => {
      this.runRetryJob().catch(err => {
        console.error(`[retry-service] Retry job failed:`, err)
      })
    }, { timezone: 'Asia/Bangkok' })
    
    console.log('[retry-service] Email retry service initialized')
  }

  /**
   * จำลองการส่งอีเมล (แทนที่ด้วย SMTP จริงในอนาคต)
   */
  private async sendEmailMock(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`\n📧 [EMAIL SENDING...] To: ${to}\nSubject: ${subject}\nBody: ${body}\n`)
    // สุ่มล้มเหลว 20% เพื่อทดสอบระบบ Retry ถ้าต้องการ
    // if (Math.random() < 0.2) throw new Error('SMTP Connection timeout')
    return true
  }

  private async sendEmailWithConfiguredTransport(to: string, subject: string, body: string): Promise<void> {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      await sendEmail(to, subject, body)
      return
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured')
    }

    await this.sendEmailMock(to, subject, body)
  }

  /**
   * Process and send an email by its log ID
   */
  async processEmail(logId: string) {
    // ดึงข้อมูล Log + Notification + User
    const [log] = await db
      .select({
        log: notificationLog,
        notification: notifications,
        user: users,
      })
      .from(notificationLog)
      .innerJoin(notifications, eq(notificationLog.notificationId, notifications.id))
      .innerJoin(users, eq(notifications.userId, users.id))
      .where(eq(notificationLog.id, logId))

    if (!log || log.log.status === 'sent') return

    try {
      // 🚀 พยายามส่งอีเมล
      await this.sendEmailWithConfiguredTransport(log.user.email, log.notification.subject, log.notification.body)

      // ถ้าสำเร็จ
      await db
        .update(notificationLog)
        .set({
          status: 'sent',
          deliveredAt: new Date(),
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(notificationLog.id, logId))

    } catch (err: any) {
      // ถ้าล้มเหลว
      await db
        .update(notificationLog)
        .set({
          status: 'failed',
          errorMessage: err.message || 'Unknown SMTP error',
          updatedAt: new Date(),
        })
        .where(eq(notificationLog.id, logId))
    }
  }

  /**
   * Cron Job สำหรับค้นหาและ Retry อีเมลที่ส่งไม่สำเร็จ
   */
  async runRetryJob() {
    const now = new Date()
    
    // ดึง Log ที่ pending หรือ failed แต่ยังพยายามไม่ถึง 3 ครั้ง (ไม่รวม attempt เริ่มต้น)
    const logsToRetry = await db
      .select()
      .from(notificationLog)
      .where(
        and(
          inArray(notificationLog.status, ['pending', 'failed']),
          lt(notificationLog.attempt, 4) // attempt 1=first, 2=retry1(1m), 3=retry2(5m), 4=retry3(15m)
        )
      )

    for (const log of logsToRetry) {
      const minutesSinceLastAttempt = (now.getTime() - log.updatedAt.getTime()) / (1000 * 60)
      
      let shouldRetry = false
      if (log.attempt === 1 && minutesSinceLastAttempt >= 1) shouldRetry = true // Retry 1 (1m)
      else if (log.attempt === 2 && minutesSinceLastAttempt >= 5) shouldRetry = true // Retry 2 (5m)
      else if (log.attempt === 3 && minutesSinceLastAttempt >= 15) shouldRetry = true // Retry 3 (15m)

      if (shouldRetry) {
        console.log(`[retry-service] Retrying email ${log.id} (Attempt ${log.attempt + 1})`)
        
        await db
          .update(notificationLog)
          .set({ attempt: log.attempt + 1, updatedAt: new Date() })
          .where(eq(notificationLog.id, log.id))

        await this.processEmail(log.id)
      } else if (log.attempt >= 4 && minutesSinceLastAttempt >= 60) {
        // ให้สถานะเป็น failed ถาวร (Dead letter)
        // (สามารถเพิ่มสถานะ dead_letter ได้ใน schema ในอนาคต ตอนนี้ทิ้งไว้ที่ failed ก่อน)
      }
    }
  }
}
