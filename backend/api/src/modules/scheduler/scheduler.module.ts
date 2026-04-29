/**
 * Scheduler Module — FR-FORM-16, FR-NOTIF-03~06, FR-WEB-08
 *
 * Cron jobs:
 * - round-open: draft → open ตาม open_at
 * - round-close: open → closed ตาม close_at
 * - reminder: ส่ง email 3 วัน + 1 วันก่อน due
 * - url-check: validate URL ทุก 24h
 */

import cron from 'node-cron'
import { db } from '../../../../db'
import { rounds, forms, websites, notifications, notificationLog } from '../../../../db/schema'
import { eq, and, isNull, lt, gt, or, sql } from 'drizzle-orm'
import { roundStatusEnum, formStatusEnum, notificationStatusEnum } from '../../../../db/schema/enums'

// Idempotency store — FR-NOTIF-06
const JOB_RUNS = new Map<string, Date>()

function todayKey(prefix: string): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0] // YYYY-MM-DD in UTC
  return `${prefix}:${date}`
}

// ─── Round Open Job ────────────────────────────────────────────────────────────
async function runRoundOpenJob() {
  const key = todayKey('round-open')
  if (JOB_RUNS.has(key)) return // already run today
  JOB_RUNS.set(key, new Date())

  const now = new Date()
  console.log('[scheduler] Running round-open job at', now.toISOString())

  // Find rounds where openDate <= now and status = draft
  const roundsToOpen = await db
    .select()
    .from(rounds)
    .where(
      and(
        eq(rounds.status, 'draft'),
        lt(rounds.openDate, now),
        isNull(rounds.deletedAt)
      )
    )

  for (const round of roundsToOpen) {
    try {
      await db
        .update(rounds)
        .set({ status: 'active' })
        .where(eq(rounds.id, round.id))

      // Auto-open forms in this round
      await db
        .update(forms)
        .set({ status: 'open' })
        .where(
          and(
            eq(forms.roundId, round.id),
            eq(forms.status, 'draft'),
            isNull(forms.deletedAt)
          )
        )

      console.log(`[scheduler] Opened round ${round.id} and associated forms`)
    } catch (err) {
      console.error(`[scheduler] Error opening round ${round.id}:`, err)
    }
  }
}

// ─── Round Close Job ───────────────────────────────────────────────────────────
async function runRoundCloseJob() {
  const key = todayKey('round-close')
  if (JOB_RUNS.has(key)) return
  JOB_RUNS.set(key, new Date())

  const now = new Date()
  console.log('[scheduler] Running round-close job at', now.toISOString())

  // Find rounds where closeDate <= now and status = active
  const roundsToClose = await db
    .select()
    .from(rounds)
    .where(
      and(
        eq(rounds.status, 'active'),
        lt(rounds.closeDate, now),
        isNull(rounds.deletedAt)
      )
    )

  for (const round of roundsToClose) {
    try {
      await db
        .update(rounds)
        .set({ status: 'closed' })
        .where(eq(rounds.id, round.id))

      // Auto-close forms in this round (FR-ROUND-07)
      await db
        .update(forms)
        .set({ status: 'closed' })
        .where(
          and(
            eq(forms.roundId, round.id),
            eq(forms.status, 'open'),
            isNull(forms.deletedAt)
          )
        )

      console.log(`[scheduler] Closed round ${round.id} and associated forms`)
    } catch (err) {
      console.error(`[scheduler] Error closing round ${round.id}:`, err)
    }
  }
}

// ─── Reminder Job ──────────────────────────────────────────────────────────────
async function runReminderJob() {
  const key = todayKey('reminder')
  if (JOB_RUNS.has(key)) return
  JOB_RUNS.set(key, new Date())

  const now = new Date()
  console.log('[scheduler] Running reminder job at', now.toISOString())

  // Find forms that are open and close in 3 days or 1 day
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const formsClosingSoon = await db
    .select()
    .from(forms)
    .where(
      and(
        eq(forms.status, 'open'),
        or(
          and(gt(forms.closeAt, now), lt(forms.closeAt, threeDaysFromNow)),
          and(gt(forms.closeAt, now), lt(forms.closeAt, oneDayFromNow))
        ),
        isNull(forms.deletedAt)
      )
    )

  for (const form of formsClosingSoon) {
    try {
      // TODO: Get assignees who haven't submitted yet
      // For now, just log
      console.log(`[scheduler] Reminder: form ${form.id} closing soon`)
    } catch (err) {
      console.error(`[scheduler] Error sending reminder for form ${form.id}:`, err)
    }
  }
}

// ─── URL Check Job ─────────────────────────────────────────────────────────────
async function runUrlCheckJob() {
  const key = todayKey('url-check')
  if (JOB_RUNS.has(key)) return
  JOB_RUNS.set(key, new Date())

  const now = new Date()
  console.log('[scheduler] Running url-check job at', now.toISOString())

  // Find websites that haven't been checked in 24 hours
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const websitesToCheck = await db
    .select()
    .from(websites)
    .where(
      and(
        isNull(websites.deletedAt),
        or(
          isNull(websites.lastValidatedAt),
          lt(websites.lastValidatedAt, twentyFourHoursAgo)
        )
      )
    )

  for (const website of websitesToCheck) {
    try {
      // Simple HEAD request with 5s timeout (FR-WEB-08, NFR-PERF-07)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      let status: 'ok' | 'unreachable' | 'unknown' = 'ok'
      try {
        const response = await fetch(website.url, {
          method: 'HEAD',
          signal: controller.signal,
        })
        if (!response.ok) status = 'unreachable'
      } catch {
        status = 'unreachable'
      } finally {
        clearTimeout(timeoutId)
      }

      await db
        .update(websites)
        .set({
          urlStatus: status,
          lastValidatedAt: now,
        })
        .where(eq(websites.id, website.id))

      console.log(`[scheduler] Checked website ${website.id}: ${status}`)

      // FR-WEB-09: Notify super_admin if unreachable
      if (status === 'unreachable') {
        // TODO: Create notification for super_admin
        console.log(`[scheduler] Website ${website.id} is unreachable - notify super_admin`)
      }
    } catch (err) {
      console.error(`[scheduler] Error checking website ${website.id}:`, err)
    }
  }
}

// ─── Exported start function ───────────────────────────────────────────────────
export function startScheduler() {
  console.log('[scheduler] Starting scheduler...')

  // Round open/close: check every minute at :00
  cron.schedule('0 * * * *', runRoundOpenJob, { timezone: 'Asia/Bangkok' })
  cron.schedule('0 * * * *', runRoundCloseJob, { timezone: 'Asia/Bangkok' })

  // Reminder: check every hour at :30
  cron.schedule('30 * * * *', runReminderJob, { timezone: 'Asia/Bangkok' })

  // URL check: run daily at 03:00 (NFR-AVAIL-06, FR-AUDIT-06)
  cron.schedule('0 3 * * *', runUrlCheckJob, { timezone: 'Asia/Bangkok' })

  console.log('[scheduler] Scheduler started successfully')
}
