const { sendMail } = require("./mailer");

function fmtDateTime(startAt) {
  const d = new Date(startAt);
  return d.toLocaleString("uk-UA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

async function notifyAdminBooking(booking) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const dt = fmtDateTime(booking.startAt);
  const subject = `Нове бронювання: ${booking.clientName} (${dt})`;

  const text =
`Нове бронювання:
Клієнт: ${booking.clientName}
Контакт: ${booking.contact}
Пакет: ${booking.packageName}
Дата/час: ${dt}
`;

  const baseUrl = process.env.APP_PUBLIC_URL || "http://localhost:5173";

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2>Нове бронювання</h2>
    <p><b>Клієнт:</b> ${booking.clientName}</p>
    <p><b>Контакт:</b> ${booking.contact}</p>
    <p><b>Пакет:</b> ${booking.packageName}</p>
    <p><b>Дата/час:</b> ${dt}</p>
    <hr/>
    <p>
      <a href="${baseUrl}/admin" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;border-radius:10px;text-decoration:none">
        Відкрити адмінку
      </a>
    </p>
  </div>
  `;

  await sendMail({ to: adminEmail, subject, text, html });
}

module.exports = { notifyAdminBooking };
