const jwt = require("jsonwebtoken");

module.exports = function adminOnly(req, res, next) {
  // Зчитуємо токен із cookie замість Authorization header[cite: 13]
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ message: "No token provided in cookies" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Перевірка ролі адміна
    if (decoded?.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};