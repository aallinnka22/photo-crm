const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Gallery = require("../models/Gallery");
const Selection = require("../models/Selection");

function normalizeCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function makeCodeLookup(code) {

  return String(code || "")
    .replace(/-/g, "")
    .slice(-4);
}


function getPhotoStatus(photo) {

  if (photo && typeof photo.status === "string" && photo.status.trim()) {
    return photo.status.trim().toLowerCase();
  }

  if (photo && typeof photo.category === "string" && photo.category.trim()) {
    return photo.category.trim().toLowerCase();
  }
  return "preview";
}


function addOneMonth(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();

  const target = new Date(y, m + 1, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));
  target.setHours(23, 59, 59, 999);
  return target;
}

// POST
async function loginByCode(req, res) {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) return res.status(400).json({ message: "No code provided" });

    const lookup = makeCodeLookup(code);

    const gallery = await Gallery.findOne({
      codeLookup: lookup,
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    });

    if (!gallery) return res.status(401).json({ message: "Invalid code" });

    const ok = await bcrypt.compare(code, gallery.accessCodeHash);
    if (!ok) return res.status(401).json({ message: "Invalid code" });

    const token = jwt.sign(
      { galleryId: gallery._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    // Встановлюємо Cookie клієнта для галереї
    res.cookie("client_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 днів
    });

    return res.json({ ok: true, galleryId: gallery._id });
  } catch (e) {
    console.error("loginByCode error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET 
async function getMyPhotos(req, res) {
  try {
    if (!req.galleryId)
      return res.status(401).json({ message: "No gallery in token" });

    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const sel = await Selection.findOne({ gallery: gallery._id });

    return res.json({
      _id: gallery._id,
      clientName: gallery.clientName,
      selectionLimit: gallery.selectionLimit,

   
      createdAt: gallery.createdAt,
      expiresAt: addOneMonth(gallery.createdAt),

      photos: (gallery.photos || []).map((p) => ({
        _id: p._id,
        url: p.url,
        filename: p.filename,
       
        status: getPhotoStatus(p),
       
        category: p.category || undefined,
      })),
      
      selected: sel ? sel.selectedPhotoIds : [],
      selectedPhotoIds: sel ? sel.selectedPhotoIds : [],
     
      comment: sel ? sel.note || sel.comment || "" : "",
    });
  } catch (e) {
    console.error("getMyPhotos error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST 
async function saveMySelection(req, res) {
  try {
    if (!req.galleryId)
      return res.status(401).json({ message: "No gallery in token" });

    const { selectedPhotoIds, comment } = req.body || {};
    if (!Array.isArray(selectedPhotoIds)) {
      return res
        .status(400)
        .json({ message: "selectedPhotoIds must be array" });
    }

    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const limit = Number(gallery.selectionLimit || 10);
    if (selectedPhotoIds.length > limit) {
      return res
        .status(400)
        .json({ message: `Selection limit exceeded (${limit})` });
    }

    const updateDoc = { gallery: gallery._id, selectedPhotoIds };

    
    if (typeof comment === "string") {
      updateDoc.note = comment;
    }

    const updated = await Selection.findOneAndUpdate(
      { gallery: gallery._id },
      updateDoc,
      { upsert: true, new: true },
    );

    return res.json({ ok: true, selection: updated });
  } catch (e) {
    console.error("saveMySelection error:", e);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET 
async function downloadMyPhoto(req, res) {
  try {
    if (!req.galleryId)
      return res.status(401).json({ message: "No gallery in token" });

    const { photoId } = req.params;

    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });

    const photo = (gallery.photos || []).find(
      (p) => p._id.toString() === String(photoId),
    );
    if (!photo) return res.status(404).json({ message: "Photo not found" });


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


// Додати в galleryController.js
async function logout(req, res) {
  res.clearCookie("client_token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  return res.json({ ok: true, message: "Logged out successfully" });
}

module.exports = {
  loginByCode,
  getMyPhotos,
  saveMySelection,
  downloadMyPhoto,
  logout,
};
