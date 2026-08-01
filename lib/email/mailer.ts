import "server-only";
import nodemailer from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
};

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return cachedTransporter;
}

/**
 * Sends an email via Gmail SMTP. Until GMAIL_APP_PASSWORD is set (see
 * .env.local.example), this logs the rendered email instead of sending —
 * lets the rest of the CRM flow (customer creation, scheduling, admin
 * editor) be tested before Gmail is wired up.
 */
export async function sendEmail({ to, subject, text }: SendEmailParams): Promise<void> {
  if (!process.env.GMAIL_APP_PASSWORD) {
    console.log(`[mailer] GMAIL_APP_PASSWORD not set — logging instead of sending.
  To: ${to}
  Subject: ${subject}
  ---
  ${text}
  ---`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
  });
}
