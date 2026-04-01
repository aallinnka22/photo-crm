const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true },
    contact: { type: String, required: true },
    packageName: { type: String, required: true },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "canceled", "completed"],
      default: "pending",
    },
    note: { type: String, default: "" },


    isBlock: { type: Boolean, default: false },
    blockReason: { type: String, default: "" },
  },
  { timestamps: true },
);

bookingSchema.index({ startAt: 1, endAt: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
