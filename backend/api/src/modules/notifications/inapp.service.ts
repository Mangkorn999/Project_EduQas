import { NotificationsService } from './notifications.service'

export class InAppService {
  constructor(private notificationsService = new NotificationsService()) {}

  async notify(data: {
    userId: string
    type: string
    title: string
    body: string
    refId?: string
    idempotencyKey?: string
  }) {
    return this.notificationsService.createInAppNotification(data)
  }
}
