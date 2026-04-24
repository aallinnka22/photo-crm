const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema(
  {
    // Cloudinary
    url: { type: String, required: true }, 
    publicId: { type: String, required: true }, 
    filename: { type: String, default: "" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },

   
    status: { type: String, enum: ["preview", "final"], default: "preview" },
  },
  { timestamps: true },
);

const GallerySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    clientName: { type: String, default: "" },
    contact: { type: String, default: "" },


    accessCodeHash: { type: String, required: true },
    codeLookup: { type: String, required: true, index: true },

    isActive: { type: Boolean, default: true },
    selectionLimit: { type: Number, default: 10 },

    photos: { type: [PhotoSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Gallery", GallerySchema);
