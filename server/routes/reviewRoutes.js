const router = require("express").Router();
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const Review = require("../models/Review");


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Дозволені тільки JPG, PNG, WEBP"));
  },
});

function uploadBufferToCloudinary(buffer, folder = "reviews") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(buffer);
  });
}


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


router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { name, contact, rating, text, website, features, shootType } =
      req.body || {};

    if (website) return res.status(400).json({ message: "Помилка" });

    if (!name?.trim() || !text?.trim()) {
      return res
        .status(400)
        .json({ message: "Заповніть імʼя та текст відгуку." });
    }

    const cleanRating = Math.max(1, Math.min(5, Number(rating || 5)));

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

    let photoUrl = "";

    if (req.file?.buffer) {
      const uploaded = await uploadBufferToCloudinary(
        req.file.buffer,
        "reviews",
      );
      photoUrl = uploaded.secure_url || "";
    }

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

    res.json({
      ok: true,
      message: "Дякую! Відгук відправлено ☺️",
    });
  } catch (e) {
    if (e instanceof multer.MulterError && e.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Фото має бути до 5 МБ." });
    }

    res.status(500).json({ message: e.message || "Помилка відправки відгуку" });
  }
});

module.exports = router;
