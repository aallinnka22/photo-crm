const Booking = require("../models/Booking");
const { notifyAdminBooking } = require("../services/notifyAdminBooking");

function makeDate(dateStr, timeStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [hh, mm] = String(timeStr).split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}

function addMinutes(dateObj, minutes) {
  return new Date(dateObj.getTime() + minutes * 60 * 1000);
}

/**
 * CLIENT: create booking (pending)
 * POST /api/bookings
 * body: { clientName, contact, packageName, date, time, duration? }
 */
exports.createBooking = async (req, res) => {
  try {
    const { clientName, contact, packageName, date, time, duration } = req.body;

    if (!clientName || !contact || !packageName || !date || !time) {
      return res.status(400).json({ message: "Заповніть імʼя, контакт, пакет, дату і час" });
    }

    const startAt = makeDate(date, time);
    if (Number.isNaN(startAt.getTime())) {
      return res.status(400).json({ message: "Некоректна дата/час" });
    }

    // default duration = 60 minutes
    const dur = Number.isFinite(Number(duration)) ? Number(duration) : 60;
    const endAt = addMinutes(startAt, dur);

    // conflict check (includes blocks too because blocks are also Bookings with active status)
    const conflict = await Booking.findOne({
      status: { $in: ["pending", "confirmed"] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });

    if (conflict) {
      return res.status(409).json({ message: "Цей час уже зайнятий" });
    }

    const booking = await Booking.create({
      clientName: String(clientName).trim(),
      contact: String(contact).trim(),
      packageName: String(packageName).trim(),
      startAt,
      endAt,
      status: "pending",
      isBlock: false,
      blockReason: "",
    });

    // ✅ ОЦЕ КЛЮЧОВЕ: відправка листа адміну
    // Не ламаємо бронювання, навіть якщо пошта впала
    try {
      await notifyAdminBooking(booking);
    } catch (mailErr) {
      console.error("notifyAdminBooking failed:", mailErr?.message || mailErr);
    }

    return res.json({
      ok: true,
      booking,
      message: "✅ Заявку відправлено! Я звʼяжусь з вами для підтвердження.",
    });
  } catch (err) {
    console.error("createBooking error:", err);
    return res.status(500).json({ message: "Помилка створення бронювання" });
  }
};

/**
 * CLIENT: availability for a date
 * GET /api/bookings/availability?date=YYYY-MM-DD
 * returns { slots: [{time, isFree}] }
 *
 * Slots: 09:00 - 19:00 (each 60 min)
 */
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date required" });

    const startDay = makeDate(date, "00:00");
    const endDay = makeDate(date, "23:59");

    const busyItems = await Booking.find({
      status: { $in: ["pending", "confirmed"] },
      startAt: { $lt: endDay },
      endAt: { $gt: startDay },
    }).select("startAt endAt");

    const slots = [];

    for (let h = 9; h < 20; h++) {
      const slotStart = makeDate(date, `${String(h).padStart(2, "0")}:00`);
      const slotEnd = addMinutes(slotStart, 60);

      const busy = busyItems.some((b) => slotStart < b.endAt && slotEnd > b.startAt);

      slots.push({
        time: `${String(h).padStart(2, "0")}:00`,
        isFree: !busy,
      });
    }

    return res.json({ slots });
  } catch (err) {
    console.error("getAvailability error:", err);
    return res.status(500).json({ message: "Помилка отримання слотів" });
  }
};

/**
 * ADMIN: list bookings (optionally filter by date)
 * GET /api/bookings?date=YYYY-MM-DD
 */
exports.getBookings = async (req, res) => {
  try {
    const { date } = req.query;

    const q = {};
    if (date) {
      const startDay = makeDate(date, "00:00");
      const endDay = makeDate(date, "23:59");
      q.startAt = { $lt: endDay };
      q.endAt = { $gt: startDay };
    }

    const bookings = await Booking.find(q).sort({ startAt: 1 });
    return res.json({ bookings });
  } catch (err) {
    console.error("getBookings error:", err);
    return res.status(500).json({ message: "Помилка отримання бронювань" });
  }
};

/**
 * ADMIN: create block (day off / busy time)
 * POST /api/bookings/block
 */
exports.adminCreateBlock = async (req, res) => {
  try {
    const { date, time, startTime, endTime, duration, reason } = req.body;

    if (!date) return res.status(400).json({ message: "date required" });

    let startAt;
    let endAt;

    if (startTime || endTime) {
      const st = startTime || "00:00";
      const et = endTime || "23:59";
      startAt = makeDate(date, st);
      endAt = makeDate(date, et);
    } else {
      const t = time || "00:00";
      startAt = makeDate(date, t);
      const dur = Number.isFinite(Number(duration)) ? Number(duration) : 60;
      endAt = addMinutes(startAt, dur);
    }

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return res.status(400).json({ message: "Некоректний час блокування" });
    }

    const conflict = await Booking.findOne({
      status: { $in: ["pending", "confirmed"] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });

    if (conflict) {
      return res.status(409).json({ message: "В цей час уже є бронювання/блок" });
    }

    const booking = await Booking.create({
      clientName: "ADMIN",
      contact: "ADMIN",
      packageName: "BLOCK",
      startAt,
      endAt,
      status: "confirmed",
      isBlock: true,
      blockReason: reason || "Blocked by admin",
      note: reason || "",
    });

    return res.json({ ok: true, booking });
  } catch (err) {
    console.error("adminCreateBlock error:", err);
    return res.status(500).json({ message: "Помилка блокування часу" });
  }
};

/**
 * ADMIN: update booking fields (status/time/note)
 * PUT /api/bookings/:id
 */
exports.adminUpdateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, startAt, endAt, note, blockReason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Not found" });

    const newStart = startAt ? new Date(startAt) : booking.startAt;
    const newEnd = endAt ? new Date(endAt) : booking.endAt;

    if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime()) || newEnd <= newStart) {
      return res.status(400).json({ message: "Некоректний час" });
    }

    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      status: { $in: ["pending", "confirmed"] },
      startAt: { $lt: newEnd },
      endAt: { $gt: newStart },
    });

    if (conflict) {
      return res.status(409).json({ message: "Конфлікт по часу з іншим записом" });
    }

    booking.startAt = newStart;
    booking.endAt = newEnd;

    if (status) booking.status = status;
    if (note !== undefined) booking.note = note;

    if (blockReason !== undefined) {
      booking.blockReason = blockReason;
      booking.isBlock = true;
      booking.packageName = "BLOCK";
      if (!booking.clientName) booking.clientName = "ADMIN";
      if (!booking.contact) booking.contact = "ADMIN";
    }

    await booking.save();
    return res.json({ ok: true, booking });
  } catch (err) {
    console.error("adminUpdateBooking error:", err);
    return res.status(500).json({ message: "Помилка оновлення" });
  }
};

/**
 * ADMIN: delete booking or block
 * DELETE /api/bookings/:id
 */
exports.adminDeleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    await Booking.findByIdAndDelete(id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("adminDeleteBooking error:", err);
    return res.status(500).json({ message: "Помилка видалення" });
  }
};
