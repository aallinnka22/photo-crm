const mongoose = require("mongoose");

const SelectionSchema = new mongoose.Schema(
  {
 
    gallery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gallery",
      required: true,
      unique: true,
    },
    selectedPhotoIds: { type: [String], default: [] },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Selection", SelectionSchema);
