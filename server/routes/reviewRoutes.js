const router = require("express").Router();
const Review = require("../models/Review");

// Public: get approved reviews for homepage
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "20", 10), 50);
    const items = await Review.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ ok: true, reviews: items });
  } catch (e) {
    res.status(500).json({ message: "Помилка отримання відгуків" });
  }
});

// Public: create review (pending)
router.post("/", async (req, res) => {
  try {
    const { name, contact, rating, text, website, features, shootType } = req.body || {};

    // Honeypot проти ботів: поле website має бути пустим
    if (website) return res.status(400).json({ message: "Помилка" });

    if (!name?.trim() || !text?.trim()) {
      return res.status(400).json({ message: "Заповніть імʼя та текст відгуку." });
    }

    const cleanRating = Math.max(1, Math.min(5, Number(rating || 5)));

    // ✅ нормалізація features
    const cleanFeatures = Array.isArray(features)
      ? features.map((x) => String(x).trim()).filter(Boolean).slice(0, 20)
      : [];

    await Review.create({
      name: String(name).trim(),
      contact: contact ? String(contact).trim() : "",
      rating: cleanRating,
      text: String(text).trim(),
      shootType: shootType ? String(shootType).trim() : "",
      features: cleanFeatures,
      status: "pending",
    });

    res.json({ ok: true, message: "✅ Дякую! Відгук відправлено на модерацію." });
  } catch (e) {
    res.status(500).json({ message: "Помилка відправки відгуку" });
  }
});

module.exports = router;