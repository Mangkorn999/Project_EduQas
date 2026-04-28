import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

export function createEmailTransporter(): nodemailer.Transporter {
  if (transporter) return transporter
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
  const t = createEmailTransporter()
  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  })
}
