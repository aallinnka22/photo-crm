const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Gallery = require("../models/Gallery");
const Selection = require("../models/Selection"); 
const { slugify, randomCode } = require("../utils/slug");
const {
  cloudinary,
  assertCloudinaryConfigured,
} = require("../services/cloudinary");
const Review = require("../models/Review");


function ensureEnv(name) {
  if (!process.env[name]) throw new Error(`${name} is missing in .env`);
}

function generateAccessCode() {
  const a = randomCode(4);
  const b = randomCode(4);
  return `${a}-${b}`;
}

function codeLookup(code) {
  return code.replace(/-/g, "").slice(-4);
}

function makeSlug(clientName) {
  const base = slugify(clientName || "client");
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${base}-${yyyy}-${mm}-${dd}-${randomCode(4).toLowerCase()}`;
}


exports.login = async (req, res) => {
  try {
    ensureEnv("JWT_SECRET");
    ensureEnv("ADMIN_PASSWORD");

    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password is required" });

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { role: "admin", email: process.env.ADMIN_EMAIL || "" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );

    return res.json({ token });
  } catch (e) {
    console.error("admin login error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.createGallery = async (req, res) => {
  try {
    const { clientName, contact, selectionLimit } = req.body;

    const accessCode = generateAccessCode();
    const hash = await bcrypt.hash(accessCode, 10);

    const gallery = await Gallery.create({
      slug: makeSlug(clientName),
      clientName: clientName || "",
      contact: contact || "",
      accessCodeHash: hash,
      codeLookup: codeLookup(accessCode),
      selectionLimit: Number(selectionLimit || 10),
      isActive: true,
      photos: [],
    });

    return res.json({ ok: true, gallery, accessCode });
  } catch (e) {
    console.error("createGallery error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.listGalleries = async (req, res) => {
  try {
   
    const items = await Gallery.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();


    const ids = items.map((g) => g._id);
    const selections = await Selection.find({ gallery: { $in: ids } })
      .select("gallery selectedPhotoIds")
      .lean();

    const selMap = new Map();
    for (const s of selections) {
      selMap.set(String(s.gallery), s);
    }

    const merged = items.map((g) => ({
      ...g,
      selectedCount: selMap.get(String(g._id))?.selectedPhotoIds?.length || 0,
    }));

    return res.json({ ok: true, items: merged });
  } catch (e) {
    console.error("listGalleries error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getGallery = async (req, res) => {
  try {
   
    const g = await Gallery.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ message: "Not found" });

   
    const sel = await Selection.findOne({ gallery: req.params.id }).lean();

    return res.json({
      ok: true,
      gallery: {
        ...g,
        selectedPhotoIds: sel?.selectedPhotoIds || [],
        comment: sel?.note || "",
      },
    });
  } catch (e) {
    console.error("getGallery error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.uploadPhotos = async (req, res) => {
  try {
    assertCloudinaryConfigured();

    const gallery = await Gallery.findById(req.params.id);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const files = req.files || [];
    if (!files.length)
      return res.status(400).json({ message: "No files uploaded" });

    const folder = process.env.CLOUDINARY_FOLDER || "photo-crm";

    const uploaded = [];
    for (const f of files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${folder}/${gallery.slug}`,
            resource_type: "image",
          },
          (err, out) => (err ? reject(err) : resolve(out)),
        );
        stream.end(f.buffer);
      });

      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
        filename: f.originalname || "",
        width: result.width || 0,
        height: result.height || 0,
        bytes: result.bytes || 0,
        status: "preview",
      });
    }

    gallery.photos.push(...uploaded);
    await gallery.save();

    return res.json({
      ok: true,
      added: uploaded.length,
      photos: gallery.photos,
    });
  } catch (e) {
    console.error("uploadPhotos error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    assertCloudinaryConfigured();

    const { id, photoId } = req.params;
    const gallery = await Gallery.findById(id);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const photo = gallery.photos.id(photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    await cloudinary.uploader.destroy(photo.publicId, {
      resource_type: "image",
    });

    photo.deleteOne();
    await gallery.save();

    return res.json({ ok: true, photos: gallery.photos });
  } catch (e) {
    console.error("deletePhoto error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};


exports.setPhotoStatus = async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const { status } = req.body;
    if (!status || !["preview", "final"].includes(String(status))) {
      return res
        .status(400)
        .json({ message: "Status must be 'preview' or 'final'" });
    }

    const gallery = await Gallery.findById(id);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const photo = gallery.photos.id(photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    photo.status = String(status);
    await gallery.save();

    return res.json({
      ok: true,
      photoId,
      status: photo.status,
      photos: gallery.photos,
    });
  } catch (e) {
    console.error("setPhotoStatus error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;

    const gallery = await Gallery.findById(id);
    if (!gallery) {
      return res.status(404).json({ message: "Галерею не знайдено" });
    }

   
    for (const photo of gallery.photos) {
      if (photo.publicId) {
        await cloudinary.uploader.destroy(photo.publicId);
      }
    }

    await Gallery.findByIdAndDelete(id);


    await Selection.deleteOne({ gallery: id });

    return res.json({ ok: true });
  } catch (e) {
    console.error("deleteGallery error:", e);
    return res.status(500).json({ message: "Помилка видалення галереї" });
  }
};


exports.listReviews = async (req, res) => {
  try {
    const status = String(req.query.status || "pending");
    const q = ["pending", "approved", "rejected"].includes(status)
      ? { status }
      : {};
    const items = await Review.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(500).json({ message: "Помилка отримання відгуків" });
  }
};

exports.setReviewStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["pending", "approved", "rejected"].includes(String(status))) {
      return res.status(400).json({ message: "Bad status" });
    }
    const item = await Review.findByIdAndUpdate(
      req.params.id,
      { status: String(status) },
      { new: true },
    ).lean();

    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true, item });
  } catch (e) {
    return res.status(500).json({ message: "Помилка оновлення" });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const item = await Review.findByIdAndDelete(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Помилка видалення" });
  }
};
