const jwt = require("jsonwebtoken");

module.exports = function galleryAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ максимально сумісно з будь-яким payload
    req.galleryId =
      decoded.galleryId || decoded.gallery || decoded._id || decoded.id || null;

    if (!req.galleryId) {
      return res.status(401).json({ message: "No galleryId in token" });
    }

    next();
  } catch (err) {
    console.error("galleryAuth error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
