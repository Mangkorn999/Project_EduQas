export class EmailService {
  async sendTemplateEmail(_payload: {
    to: string
    subject: string
    body: string
  }) {
    return { status: 'sent' as const }
  }
}
