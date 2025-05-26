const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  imagePath: { type: String, required: true },
  caption: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadDate: { type: Date, default: Date.now }
});
galleryImageSchema.index({ caption: 'text' });
module.exports = mongoose.model('GalleryImage', galleryImageSchema);