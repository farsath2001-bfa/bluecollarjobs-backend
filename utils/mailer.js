/**
 * Transactional email through Brevo's HTTP API.
 * (Render's free plan blocks SMTP ports, so an HTTP API is used instead of nodemailer.)
 *
 * Env: BREVO_API_KEY, MAIL_FROM_EMAIL, MAIL_FROM_NAME, ADMIN_NOTIFY_EMAIL, FRONTEND_URL
 * Without BREVO_API_KEY, emails are logged to the console instead of sent, so dev never breaks.
 */
const SITE = () => (process.env.FRONTEND_URL || 'https://bluecollarjobs-frontend.vercel.app').replace(/\/$/, '');

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Simple branded layout that renders well in Gmail/Outlook
const layout = (title, bodyHtml, cta) => `
<!doctype html><html><body style="margin:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#141a2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dce1ea">
        <tr><td style="background:#0e1b45;padding:18px 24px;border-bottom:3px solid #e5382d">
          <span style="color:#ffffff;font-size:20px;font-weight:bold">Jobz Dxb</span>
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
          ${bodyHtml}
          ${cta ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="background:#2342b0;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f3f5f9;color:#5b6478;font-size:12px">
          Jobz Dxb never asks job seekers to pay for a job or visa. Report anything suspicious at ${SITE()}/contact
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const p = (text) => `<p style="margin:0 0 10px;line-height:1.6">${text}</p>`;

async function sendEmail({ to, subject, html, replyTo }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return { skipped: true };

  if (!process.env.BREVO_API_KEY) {
    console.log(`📧 [email not sent — BREVO_API_KEY missing] to=${recipients.join(',')} subject="${subject}"`);
    // Local development only: print the links so flows like password reset can be tested without email
    if (process.env.NODE_ENV !== 'production') {
      const links = [...String(html).matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^mailto:/.test(u));
      if (links.length) console.log(`   links: ${[...new Set(links)].join('  ')}`);
    }
    return { skipped: true };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || 'Jobz Dxb' },
        to: recipients.map((email) => ({ email })),
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      console.error(`📧 Email failed (${res.status}):`, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    // Email problems must never break the request that triggered them
    console.error('📧 Email error:', err.message);
    return { ok: false };
  }
}

// Fire-and-forget helper for controllers
const sendLater = (args) => {
  sendEmail(args).catch(() => {});
};

// ---------- Templates ----------
const STATUS_TEXT = {
  pending: 'Your application has been received and is waiting for review.',
  reviewed: 'The employer has reviewed your application.',
  shortlisted: 'Good news — you have been shortlisted. Expect a phone call soon, so keep your phone on.',
  accepted: 'Congratulations! The employer wants to hire you. They will contact you with next steps.',
  rejected: 'The employer has chosen other candidates for this job. Keep applying — new jobs are added every week.',
};

const templates = {
  applicationReceivedCandidate: ({ name, job }) => ({
    subject: `Application sent: ${job.title}`,
    html: layout(
      'Your application was sent',
      p(`Hi ${escapeHtml(name)},`) +
        p(`You applied for <strong>${escapeHtml(job.title)}</strong> at <strong>${escapeHtml(job.companyName)}</strong> (${escapeHtml(job.location)}).`) +
        p('The employer will call you on the phone number you gave. You can follow the status of your application on your dashboard.'),
      { label: 'Track my application', url: `${SITE()}/applied` }
    ),
  }),

  applicationReceivedAdmin: ({ applicant, job, application }) => ({
    subject: `New application: ${job.title} — ${applicant.name}`,
    html: layout(
      'New application',
      p(`<strong>${escapeHtml(applicant.name)}</strong> applied for <strong>${escapeHtml(job.title)}</strong> at ${escapeHtml(job.companyName)}.`) +
        p(`Phone: <strong>${escapeHtml(application.phone)}</strong><br/>Email: ${escapeHtml(applicant.email)}<br/>Can start: ${escapeHtml(application.availableFrom || 'Not given')}<br/>UAE visa: ${application.hasUaeVisa ? 'Yes' : 'No / not given'}`) +
        (application.resume ? p(`CV: <a href="${application.resume}">${escapeHtml(application.resume)}</a>`) : '') +
        (application.coverLetter ? p(`Message: ${escapeHtml(application.coverLetter)}`) : ''),
      { label: 'Review in admin', url: `${SITE()}/admin/applications` }
    ),
  }),

  statusChanged: ({ name, job, status }) => ({
    subject: `Update on your application: ${job.title}`,
    html: layout(
      `Application ${status}`,
      p(`Hi ${escapeHtml(name)},`) +
        p(`Your application for <strong>${escapeHtml(job.title)}</strong> at <strong>${escapeHtml(job.companyName)}</strong> is now <strong>${escapeHtml(status)}</strong>.`) +
        p(STATUS_TEXT[status] || ''),
      { label: 'View my applications', url: `${SITE()}/applied` }
    ),
  }),

  passwordReset: ({ name, url }) => ({
    subject: 'Reset your Jobz Dxb password',
    html: layout(
      'Reset your password',
      p(`Hi ${escapeHtml(name)},`) +
        p('Someone (hopefully you) asked to reset the password for your Jobz Dxb account. The link below works for 30 minutes.') +
        p("If you didn't ask for this, you can ignore this email — your password stays the same."),
      { label: 'Choose a new password', url }
    ),
  }),

  contactMessage: ({ name, email, phone, subject, message }) => ({
    subject: `Contact form: ${subject || 'New message'} — ${name}`,
    html: layout(
      'New message from the website',
      p(`From <strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}${phone ? `, ${escapeHtml(phone)}` : ''})`) +
        p(`<strong>${escapeHtml(subject || 'No subject')}</strong>`) +
        p(escapeHtml(message).replace(/\n/g, '<br/>')),
      { label: 'Open messages', url: `${SITE()}/admin/messages` }
    ),
  }),

  welcome: ({ name }) => ({
    subject: 'Welcome to Jobz Dxb',
    html: layout(
      `Welcome, ${name.split(' ')[0]}`,
      p('Your account is ready. Browse jobs with the salary shown upfront and apply in under a minute.') +
        p('Tip: add your phone number, experience and CV to your profile — employers call candidates with complete profiles first.'),
      { label: 'Find jobs', url: `${SITE()}/jobs` }
    ),
  }),
};

module.exports = { sendEmail, sendLater, templates, SITE };
