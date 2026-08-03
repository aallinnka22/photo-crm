const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser"); // 1. Підключаємо cookie-parser
require("dotenv").config();

const bookingRoutes = require("./routes/bookingRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();



// Перераховуємо точні домени без wildcards
const allowedOrigins = [
  "http://localhost:5173",
  "https://ashchphh.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Дозволяємо запити без origin (наприклад, Postman або системні)
      if (!origin) return callback(null, true);

      // Перевіряємо, чи є origin у списку дозволених або чи це поддомен vercel
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".vercel.app")) {
        // Повертаємо конкретний origin замість '*'
        return callback(null, origin); 
      }
      
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // 👈 Передаємо cookie
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

// Обов'язково обробляємо preflight (OPTIONS) запити для всіх маршрутів
app.options("*", cors());

app.use(cookieParser()); // 3. Middleware для зчитування req.cookies
app.use(express.json({ limit: "10mb" }));




const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/photo_site";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });


app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/bookings", bookingRoutes);
app.use("/api/galleries", galleryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);

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


const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
