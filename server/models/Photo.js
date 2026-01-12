const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  gallery: { type: mongoose.Schema.Types.ObjectId, ref: 'Gallery', required: true, index: true },
  url: { type: String, required: true },
  filename: { type: String, default: '' },
  order: { type: Number, default: 0 },
  meta: { type: Object, default: {} }
}, { timestamps: true });

photoSchema.index({ gallery: 1, order: 1 });

module.exports = mongoose.model('Photo', photoSchema);
