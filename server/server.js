const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const bookingRoutes = require("./routes/bookingRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

// ===== MIDDLEWARE =====
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ===== DB =====
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/photo_site";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ===== ROUTES =====
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/bookings", bookingRoutes);
app.use("/api/galleries", galleryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

// ===== STATIC (тільки якщо реально існує папка site) =====
// На Render ми фронт НЕ віддаємо (він буде на Vercel)
const STATIC_DIR = path.join(__dirname, "..", "site");
try {
  // якщо index.html існує — тоді віддаємо статичку
  const indexPath = path.join(STATIC_DIR, "index.html");
  const fs = require("fs");
  if (fs.existsSync(indexPath)) {
    app.use(express.static(STATIC_DIR));
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(indexPath);
    });
    console.log("🟦 Static site enabled:", STATIC_DIR);
  } else {
    console.log("🟨 Static site disabled (no site/index.html)");
  }
} catch (e) {
  console.log("🟨 Static site disabled");
}

// ===== START =====
const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
