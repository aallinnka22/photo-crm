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
app.use(cors());
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

// ===== STATIC (опціонально) =====
const STATIC_DIR = path.join(__dirname, "..", "site");
app.use(express.static(STATIC_DIR));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

// ===== START =====
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
