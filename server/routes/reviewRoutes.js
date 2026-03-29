const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Review = require("../models/Review");

// папка для фото відгуків
const uploadDir = path.join(__dirname, "..", "uploads", "reviews");
fs.mkdirSync(uploadDir, { recursive: true });

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `review_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Дозволені тільки JPG, PNG, WEBP"));
  },
});

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
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { name, contact, rating, text, website, features, shootType } = req.body || {};

    // Honeypot проти ботів: поле website має бути пустим
    if (website) return res.status(400).json({ message: "Помилка" });

    if (!name?.trim() || !text?.trim()) {
      return res.status(400).json({ message: "Заповніть імʼя та текст відгуку." });
    }

    const cleanRating = Math.max(1, Math.min(5, Number(rating || 5)));

    // ✅ нормалізація features
    let cleanFeatures = [];

    if (Array.isArray(features)) {
      cleanFeatures = features;
    } else if (typeof features === "string") {
      try {
        const parsed = JSON.parse(features);
        cleanFeatures = Array.isArray(parsed) ? parsed : [features];
      } catch {
        cleanFeatures = [features];
      }
    }

    cleanFeatures = cleanFeatures
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 20);

    const photoUrl = req.file ? `/uploads/reviews/${req.file.filename}` : "";

    await Review.create({
      name: String(name).trim(),
      contact: contact ? String(contact).trim() : "",
      rating: cleanRating,
      text: String(text).trim(),
      shootType: shootType ? String(shootType).trim() : "",
      features: cleanFeatures,
      photoUrl,
      status: "pending",
    });

    res.json({ ok: true, message: "✅ Дякую! Відгук відправлено на модерацію." });
  } catch (e) {
    if (e instanceof multer.MulterError && e.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Фото має бути до 5 МБ." });
    }

    res.status(500).json({ message: e.message || "Помилка відправки відгуку" });
  }
});

module.exports = router;