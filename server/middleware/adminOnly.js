const jwt = require("jsonwebtoken");

module.exports = function adminOnly(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token provided" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // перевірка ролі адміна
    if (decoded?.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
