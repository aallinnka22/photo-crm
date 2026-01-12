const nodemailer = require("nodemailer");

function createTransporter() {
  const provider = (process.env.MAIL_PROVIDER || "smtp").toLowerCase();

  if (provider === "gmail") {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error("MAIL_USER / MAIL_PASS are required for gmail provider");
    }
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });
  }

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
  const transporter = createTransporter();

  const from = process.env.MAIL_FROM || process.env.MAIL_USER || process.env.SMTP_USER;
  if (!from) throw new Error("MAIL_FROM (or MAIL_USER/SMTP_USER) is missing");
  if (!to) throw new Error("Recipient email is missing");

  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail };
