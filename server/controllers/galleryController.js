const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Gallery = require("../models/Gallery");
const Selection = require("../models/Selection");

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
function codeLookup(code) {
  return normalizeCode(code).replace(/-/g, "").slice(-4);
}

exports.loginByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required" });

    const lookup = codeLookup(code);
    const candidates = await Gallery.find({ codeLookup: lookup, isActive: true }).limit(20);
    if (!candidates.length) return res.status(401).json({ message: "Wrong code" });

    const full = normalizeCode(code);
    let gallery = null;
    for (const g of candidates) {
      const ok = await bcrypt.compare(full, g.accessCodeHash);
      if (ok) { gallery = g; break; }
    }
    if (!gallery) return res.status(401).json({ message: "Wrong code" });

    if (!process.env.JWT_SECRET) return res.status(500).json({ message: "JWT_SECRET is missing" });

    const token = jwt.sign(
      { galleryId: gallery._id, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      ok: true,
      token,
      gallery: {
        id: gallery._id,
        clientName: gallery.clientName,
        selectionLimit: gallery.selectionLimit,
      },
    });
  } catch (e) {
    console.error("loginByCode error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getMyPhotos = async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery || !gallery.isActive) return res.status(404).json({ message: "Gallery not found" });

    const selection = await Selection.findOne({ galleryId: gallery._id });

    return res.json({
      ok: true,
      gallery: {
        id: gallery._id,
        clientName: gallery.clientName,
        selectionLimit: gallery.selectionLimit,
      },
      photos: gallery.photos,
      selection: selection ? { selectedPhotoIds: selection.selectedPhotoIds, note: selection.note } : { selectedPhotoIds: [], note: "" },
    });
  } catch (e) {
    console.error("getMyPhotos error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.saveMySelection = async (req, res) => {
  try {
    const { selectedPhotoIds, note } = req.body;
    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery || !gallery.isActive) return res.status(404).json({ message: "Gallery not found" });

    const ids = Array.isArray(selectedPhotoIds) ? selectedPhotoIds.map(String) : [];
    const limit = gallery.selectionLimit || 10;
    if (ids.length > limit) return res.status(400).json({ message: `Selection limit is ${limit}` });

    const updated = await Selection.findOneAndUpdate(
      { galleryId: gallery._id },
      { $set: { selectedPhotoIds: ids, note: String(note || "") } },
      { upsert: true, new: true }
    );

    return res.json({ ok: true, selection: { selectedPhotoIds: updated.selectedPhotoIds, note: updated.note } });
  } catch (e) {
    console.error("saveMySelection error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// Download photo (ONLY if status === 'final')
exports.downloadMyPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;
    const gallery = await Gallery.findById(req.galleryId);
    if (!gallery || !gallery.isActive) return res.status(404).json({ message: "Gallery not found" });

    const photo = gallery.photos.id(photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    if (String(photo.status || "preview") !== "final") {
      return res.status(403).json({ message: "Photo is not available for download yet" });
    }

    return res.redirect(photo.url);
  } catch (e) {
    console.error("downloadMyPhoto error:", e.message);
    return res.status(500).json({ message: "Server error" });
  }
};
