const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    contact: { type: String, trim: true, maxlength: 80 }, // insta/phone optional
    rating: { type: Number, default: 5, min: 1, max: 5 },
    text: { type: String, required: true, trim: true, maxlength: 600 },

    // ✅ ADDED: тип зйомки
    shootType: { type: String, trim: true, maxlength: 50, default: "" },

    // ✅ ADDED: що сподобалось (можна обрати декілька)
    features: { type: [String], default: [] },

    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);