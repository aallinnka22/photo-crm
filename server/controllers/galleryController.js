const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Gallery = require("../models/Gallery");
const Selection = require("../models/Selection");

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function makeCodeLookup(code) {
  // як в adminController: code.replace(/-/g, "").slice(-4)
  return String(code || "").replace(/-/g, "").slice(-4);
}

// helper: визначаємо тип фото (final/preview) незалежно від того, як саме збережено в БД
function getPhotoStatus(photo) {
  // ✅ пріоритет: status (правильне поле)
  if (photo && typeof photo.status === "string" && photo.status.trim()) {
    return photo.status.trim().toLowerCase();
  }
  // ✅ fallback: category (якщо десь ще використовується старе поле)
  if (photo && typeof photo.category === "string" && photo.category.trim()) {
    return photo.category.trim().toLowerCase();
  }
  return "preview";
}

// POST /api/galleries/login
async function loginByCode(req, res) {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) return res.status(400).json({ message: "No code provided" });

    const lookup = makeCodeLookup(code);

    // ✅ не прив'язуємось жорстко до isActive, бо його може не бути
    const gallery = await Gallery.findOne({
      codeLookup: lookup,
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    });

    if (!gallery) return res.status(401).json({ message: "Invalid code" });

    // ✅ перевіряємо повний код через bcrypt (бо в БД зберігається hash)
    const ok = await bcrypt.compare(code, gallery.accessCodeHash);
    if (!ok) return res.status(401).json({ message: "Invalid code" });

    const token = jwt.sign(
      { galleryId: gallery._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({ token });
  } catch (e) {
    console.error("loginByCode error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/galleries/me/photos
async function getMyPhotos(req, res) {
  try {
    if (!req.galleryId) return res.status(401).json({ message: "No gallery in token" });

    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const sel = await Selection.findOne({ gallery: gallery._id });

    return res.json({
      _id: gallery._id,
      clientName: gallery.clientName,
      selectionLimit: gallery.selectionLimit,
      photos: (gallery.photos || []).map((p) => ({
        _id: p._id,
        url: p.url,
        filename: p.filename,
        // ✅ КЛЮЧОВЕ: віддаємо клієнту status (preview/final), щоб UI міг:
        // - preview: тільки лайк/вибір на ретуш
        // - final: можна скачати
        status: getPhotoStatus(p),
        // ✅ не ламаємо, якщо фронт десь ще читає category
        category: p.category || undefined,
      })),
      // ✅ не ламаємо існуючий фронт (selected), але краще надалі використовувати selectedPhotoIds
      selected: sel ? sel.selectedPhotoIds : [],
      selectedPhotoIds: sel ? sel.selectedPhotoIds : [],
      // якщо в Selection є поле note/comment — фронт може показувати коментар
      comment: sel ? (sel.note || sel.comment || "") : "",
    });
  } catch (e) {
    console.error("getMyPhotos error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/galleries/me/selection
async function saveMySelection(req, res) {
  try {
    if (!req.galleryId) return res.status(401).json({ message: "No gallery in token" });

    const { selectedPhotoIds, comment } = req.body || {};
    if (!Array.isArray(selectedPhotoIds)) {
      return res.status(400).json({ message: "selectedPhotoIds must be array" });
    }

    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const limit = Number(gallery.selectionLimit || 10);
    if (selectedPhotoIds.length > limit) {
      return res.status(400).json({ message: `Selection limit exceeded (${limit})` });
    }

    const updateDoc = { gallery: gallery._id, selectedPhotoIds };

    // ✅ якщо хочеш зберігати коментар клієнта (не ламає, якщо поля нема в схемі — просто ігнорується mongoose)
    if (typeof comment === "string") {
      updateDoc.note = comment;
    }

    const updated = await Selection.findOneAndUpdate(
      { gallery: gallery._id },
      updateDoc,
      { upsert: true, new: true }
    );

    return res.json({ ok: true, selection: updated });
  } catch (e) {
    console.error("saveMySelection error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/galleries/me/photos/:photoId/download
async function downloadMyPhoto(req, res) {
  try {
    if (!req.galleryId) return res.status(401).json({ message: "No gallery in token" });

    const { photoId } = req.params;

    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const photo = (gallery.photos || []).find((p) => p._id.toString() === String(photoId));
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    // ✅ тільки final можна качати (підтримуємо status або category)
    if (getPhotoStatus(photo) !== "final") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!photo.url) return res.status(400).json({ message: "No photo url" });

    return res.redirect(photo.url);
  } catch (e) {
    console.error("downloadMyPhoto error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  loginByCode,
  getMyPhotos,
  saveMySelection,
  downloadMyPhoto,
};
