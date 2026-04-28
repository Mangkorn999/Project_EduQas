import cron from 'node-cron'

import { runReminderJob } from './jobs/reminder.job'
import { runRoundOpenJob } from './jobs/round-open.job'
import { runRoundCloseJob } from './jobs/round-close.job'
import { runUrlCheckJob } from './jobs/url-check.job'

export function registerCronJobs() {
  if (process.env.CRON_ENABLED !== 'true') return

  cron.schedule('0 * * * *', () => {
    void runReminderJob()
  }, { timezone: 'Asia/Bangkok' })

  cron.schedule('*/15 * * * *', () => {
    void runRoundOpenJob()
    void runRoundCloseJob()
  }, { timezone: 'Asia/Bangkok' })

  cron.schedule('0 3 * * *', () => {
    void runUrlCheckJob()
  }, { timezone: 'Asia/Bangkok' })
}
