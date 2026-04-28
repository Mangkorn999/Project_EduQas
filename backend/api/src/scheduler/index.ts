import cron from 'node-cron'
import { db } from '../../../db'
import { websites, forms, users, refreshTokens, auditLog, auditLogArchive, evaluatorAssignments, responses } from '../../../db/schema'
import { eq, and, isNull, lte, lt, isNotNull, inArray } from 'drizzle-orm'
import { NotificationsService } from '../modules/notifications/notifications.service'

const notificationsService = new NotificationsService()

export function startScheduler(): void {
  cron.schedule('0 2 * * *', async () => {
    try {
      const allWebsites = await db
        .select()
        .from(websites)
        .where(and(isNull(websites.deletedAt), eq(websites.isActive, true)))

      for (const website of allWebsites) {
        let urlStatus: 'ok' | 'unreachable' = 'unreachable'
        try {
          const res = await fetch(website.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          })
          urlStatus = res.ok ? 'ok' : 'unreachable'
        } catch {
          urlStatus = 'unreachable'
        }

        await db
          .update(websites)
          .set({ urlStatus, lastValidatedAt: new Date() })
          .where(eq(websites.id, website.id))

        if (urlStatus === 'unreachable') {
          const superAdmins = await db
            .select()
            .from(users)
            .where(and(eq(users.role, 'super_admin'), isNull(users.deletedAt)))

          for (const admin of superAdmins) {
            await notificationsService.createNotification({
              userId: admin.id,
              kind: 'url_unreachable',
              subject: `URL unreachable: ${website.name}`,
              body: `The URL for website "${website.name}" (${website.url}) is unreachable.`,
              relatedWebsiteId: website.id,
              idempotencyKey: `url_unreachable:${website.id}:${admin.id}:${new Date().toISOString().split('T')[0]}`,
            })
          }
        }
      }
    } catch (err) {
      console.error('[scheduler:validateUrls]', err)
    }
  })

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()

      await db
        .update(forms)
        .set({ status: 'open' })
        .where(
          and(
            eq(forms.status, 'draft'),
            lte(forms.openAt, now),
            isNull(forms.deletedAt),
          ),
        )

      await db
        .update(forms)
        .set({ status: 'closed' })
        .where(
          and(
            eq(forms.status, 'open'),
            lte(forms.closeAt, now),
            isNull(forms.deletedAt),
          ),
        )
    } catch (err) {
      console.error('[scheduler:autoOpenCloseForms]', err)
    }
  })

  cron.schedule('0 8 * * *', async () => {
    try {
      const now = new Date()

      const openForms = await db
        .select()
        .from(forms)
        .where(
          and(
            eq(forms.status, 'open'),
            isNotNull(forms.closeAt),
            isNull(forms.deletedAt),
          ),
        )

      for (const form of openForms) {
        if (!form.closeAt) continue

        const msUntilClose = form.closeAt.getTime() - now.getTime()
        const daysUntilClose = msUntilClose / (1000 * 60 * 60 * 24)

        let kind: string | null = null
        if (daysUntilClose >= 2.5 && daysUntilClose < 3.5) {
          kind = 'reminder_3d'
        } else if (daysUntilClose >= 0.5 && daysUntilClose < 1.5) {
          kind = 'reminder_1d'
        }

        if (!kind) continue

        const assignments = await db
          .select()
          .from(evaluatorAssignments)
          .where(eq(evaluatorAssignments.roundId, form.roundId!))

        for (const assignment of assignments) {
          const [submitted] = await db
            .select()
            .from(responses)
            .where(
              and(
                eq(responses.formId, form.id),
                eq(responses.respondentId, assignment.userId),
                isNotNull(responses.submittedAt),
              ),
            )

          if (submitted) continue

          const idempotencyKey = `reminder:${form.id}:${assignment.userId}:${kind}:${form.closeAt.toISOString().split('T')[0]}`

          await notificationsService.createNotification({
            userId: assignment.userId,
            kind,
            subject: `Reminder: "${form.title}" closes ${kind === 'reminder_3d' ? 'in 3 days' : 'tomorrow'}`,
            body: `Please complete your evaluation for "${form.title}" before ${form.closeAt.toLocaleString()}.`,
            relatedFormId: form.id,
            idempotencyKey,
          })
        }
      }
    } catch (err) {
      console.error('[scheduler:sendReminders]', err)
    }
  })

  cron.schedule('0 3 * * *', async () => {
    try {
      await db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, new Date()))
    } catch (err) {
      console.error('[scheduler:purgeExpiredTokens]', err)
    }
  })

  cron.schedule('15 3 * * *', async () => {
    try {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

      const sevenYearsAgo = new Date()
      sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7)

      const rows = await db
        .select()
        .from(auditLog)
        .where(lt(auditLog.createdAt, twoYearsAgo))

      if (rows.length > 0) {
        await db.insert(auditLogArchive).values(
          rows.map((r) => ({
            uuid: r.uuid,
            userId: r.userId,
            action: r.action,
            entityType: r.entityType,
            entityId: r.entityId,
            oldValue: r.oldValue,
            newValue: r.newValue,
            ip: r.ip,
            prevHash: r.prevHash,
            hash: r.hash,
            createdAt: r.createdAt,
          })),
        ).onConflictDoNothing()

        const ids = rows.map((r) => r.id)
        await db.delete(auditLog).where(inArray(auditLog.id, ids))
      }

      await db
        .delete(auditLogArchive)
        .where(lt(auditLogArchive.createdAt, sevenYearsAgo))
    } catch (err) {
      console.error('[scheduler:archiveAuditLog]', err)
    }
  })
}
