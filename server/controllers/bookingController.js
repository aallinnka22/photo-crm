const Booking = require('../models/Booking');

function makeDate(dateStr, timeStr) {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
  return new Date(`${dateStr}T${timeStr}:00`);
}

function fmtTime(d) {
  const dd = new Date(d);
  return dd.toTimeString().slice(0, 5);
}

// POST /api/bookings
exports.createBooking = async (req, res) => {
  try {
    const { clientName, contact, packageName, date, time } = req.body;

    if (!clientName || !contact || !packageName || !date || !time) {
      return res.status(400).json({
        message: "Заповни всі поля: ім'я, контакт, пакет, дата, час",
      });
    }

    const startAt = makeDate(date, time);
    if (Number.isNaN(startAt.getTime())) {
      return res.status(400).json({ message: 'Некоректна дата/час' });
    }

    // Тривалість бронювання (можеш змінити): 1 година
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    // Конфлікт по часу (перетин)
    const conflict = await Booking.findOne({
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startAt: { $lt: endAt, $gte: startAt } },
        { endAt: { $gt: startAt, $lte: endAt } },
        { startAt: { $lte: startAt }, endAt: { $gte: endAt } },
      ],
    });

    if (conflict) {
      return res.status(409).json({ message: 'Цей час вже зайнятий. Обери інший.' });
    }

    const booking = await Booking.create({
      clientName: clientName.trim(),
      contact: contact.trim(),
      packageName: packageName.trim(),
      startAt,
      endAt,
      status: 'pending',
    });

    return res.status(201).json({ ok: true, booking });
  } catch (err) {
    console.error('createBooking error:', err.message);
    return res.status(500).json({ message: 'Серверна помилка' });
  }
};

// GET /api/bookings
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ startAt: -1 });
    return res.json({ ok: true, bookings });
  } catch (err) {
    console.error('getBookings error:', err.message);
    return res.status(500).json({ message: 'Серверна помилка' });
  }
};

// GET /api/availability?date=YYYY-MM-DD
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Потрібен параметр date=YYYY-MM-DD' });

    // Слоти (як у твоєму script.js)
    const allSlots = ['09:00', '10:30', '12:00', '14:00', '16:00', '18:00'];

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const bookings = await Booking.find({
      status: { $in: ['pending', 'confirmed'] },
      startAt: { $gte: dayStart, $lte: dayEnd },
    });

    const bookedTimes = new Set(bookings.map(b => fmtTime(b.startAt)));

    const slots = allSlots.map(t => ({ time: t, isFree: !bookedTimes.has(t) }));
    return res.json({ ok: true, slots });
  } catch (err) {
    console.error('getAvailability error:', err.message);
    return res.status(500).json({ message: 'Серверна помилка' });
  }
};
