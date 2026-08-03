const jwt = require("jsonwebtoken");

module.exports = function galleryAuth(req, res, next) {
  // Зчитуємо токен із cookie замість Authorization header[cite: 14]
  const token = req.cookies?.client_token;
  if (!token) {
    return res.status(401).json({ message: "No token provided in cookies" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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