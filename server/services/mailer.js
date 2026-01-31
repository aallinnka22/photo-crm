const nodemailer = require("nodemailer");
const { Resend } = require("resend");

function createTransporter() {
  const provider = (process.env.MAIL_PROVIDER || "smtp").toLowerCase();

  // ✅ RESEND (API, без SMTP)
  if (provider === "resend") {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required for resend provider");
    }
    return null; // transporter не потрібен
  }

  // ✅ GMAIL (SMTP)
  if (provider === "gmail") {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error("MAIL_USER / MAIL_PASS are required for gmail provider");
    }
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      // можна додати timeout, але у тебе проблема саме в мережі Render -> SMTP
    });
  }

  // ✅ SMTP
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS are required for smtp provider");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendMail({ to, subject, text, html }) {
  const provider = (process.env.MAIL_PROVIDER || "smtp").toLowerCase();

  const from = process.env.MAIL_FROM || process.env.MAIL_USER || process.env.SMTP_USER;
  if (!from) throw new Error("MAIL_FROM (or MAIL_USER/SMTP_USER) is missing");
  if (!to) throw new Error("Recipient email is missing");

  // ✅ RESEND SEND
  if (provider === "resend") {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });

    return;
  }

  // ✅ SMTP / GMAIL SEND
  const transporter = createTransporter();
  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail };
