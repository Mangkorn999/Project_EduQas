import { EmailService } from './email.service'
import { NotificationsService } from './notifications.service'

export class RetryService {
  constructor(
    private notificationsService = new NotificationsService(),
    private emailService = new EmailService()
  ) {}

  async retryNotification(id: string) {
    const notification = await this.notificationsService.resend(id)

    if (notification.channel === 'email') {
      await this.emailService.sendTemplateEmail({
        to: 'pending@example.com',
        subject: notification.title,
        body: notification.body,
      })
    }

    return notification
  }
}
