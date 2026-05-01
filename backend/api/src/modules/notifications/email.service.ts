import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function requireSmtpConfig() {
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`SMTP is not configured: missing ${missing.join(', ')}`)
  }
}

export function createEmailTransporter(): nodemailer.Transporter {
  if (transporter) return transporter
  requireSmtpConfig()
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  requireSmtpConfig()
  const t = createEmailTransporter()
  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  })
}
