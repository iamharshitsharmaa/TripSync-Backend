import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: { user: 'resend', pass: process.env.RESEND_API_KEY }
})

export const sendInviteEmail = async ({ to, inviterName, tripTitle, inviteLink }) => {
  await transporter.sendMail({
    from: 'TripSync <noreply@yourdomain.com>',
    to,
    subject: `${inviterName} invited you to ${tripTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px">
        <h2>You're invited! ✈️</h2>
        <p><strong>${inviterName}</strong> invited you to collaborate on <strong>${tripTitle}</strong>.</p>
        <a href="${inviteLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;
          background:#4f8ef7;color:white;text-decoration:none;border-radius:8px;font-weight:600">
          Accept Invite
        </a>
        <p style="margin-top:16px;color:#888;font-size:12px">Link expires in 72 hours.</p>
      </div>
    `
  })
}