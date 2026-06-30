type InvitationEmail = {
  to: string
  tripName: string
  acceptUrl: string
}

export async function sendInvitationEmail({ to, tripName, acceptUrl }: InvitationEmail) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return false
  }

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: `Trip invitation: ${tripName}`,
    text: `You have been invited to join "${tripName}". Open your dashboard to accept, or use this link: ${acceptUrl}`,
  })

  return true
}
