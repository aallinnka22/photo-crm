const nodemailer = require("nodemailer");

let cachedTransporter = null;

function createTransporter() {
  const provider = (process.env.MAIL_PROVIDER || "smtp").toLowerCase();

  // Таймаути, щоб не "висіло" по 20-40 секунд
  const common = {
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };

  if (provider === "gmail") {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error("MAIL_USER / MAIL_PASS are required for gmail provider");
    }

    // Надійніше, ніж service:"gmail" (менше сюрпризів на хостингах)
    return nodemailer.createTransport({
      ...common,
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
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
    ...common,
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter();

    // Перевірка при старті (в логах Render буде видно, ок чи ні)
    cachedTransporter.verify().then(
      () => console.log("✅ Mail transporter ready"),
      (err) => console.error("❌ Mail transporter verify failed:", err?.message || err)
    );
  }
  return cachedTransporter;
}

async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();

  const from = process.env.MAIL_FROM || process.env.MAIL_USER || process.env.SMTP_USER;
  if (!from) throw new Error("MAIL_FROM (or MAIL_USER/SMTP_USER) is missing");
  if (!to) throw new Error("Recipient email is missing");

  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail };
