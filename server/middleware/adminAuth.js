const jwt = require("jsonwebtoken");

module.exports = function adminAuth(req, res, next) {
  // Зчитуємо токен із cookie замість Authorization header[cite: 11]
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ message: "No token in cookies" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });
    req.admin = { email: decoded.email || "" };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};