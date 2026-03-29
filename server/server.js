const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const bookingRoutes = require("./routes/bookingRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const app = express();

/* =========================
   CORS (Vercel + Render)
   ========================= */
const allowedOrigins = [
  process.env.FRONTEND_URL,          // production frontend (Vercel)
  "http://localhost:5173",            // local Vite
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // дозволяємо запити без origin (Postman, curl)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app"); // всі preview деплої Vercel

      if (isAllowed) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false, // ❗ у тебе Bearer token, cookies НЕ використовуються
  })
);

app.use(express.json({ limit: "10mb" }));

/* =========================
   MongoDB
   ========================= */
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/photo_site";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

/* =========================
   Routes
   ========================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/bookings", bookingRoutes);
app.use("/api/galleries", galleryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
/* =========================
   Static (НЕ обовʼязково)
   Render не віддає фронт,
   фронт у тебе на Vercel
   ========================= */
const STATIC_DIR = path.join(__dirname, "..", "site");
const indexPath = path.join(STATIC_DIR, "index.html");

if (fs.existsSync(indexPath)) {
  app.use(express.static(STATIC_DIR));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(indexPath);
  });
  console.log("🟦 Static site enabled:", STATIC_DIR);
} else {
  console.log("🟨 Static site disabled (no site/index.html)");
}

/* =========================
   Start server
   ========================= */
const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
