const mongoose = require('mongoose');

const placeResultSchema = new mongoose.Schema(
  {
    placeId: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String, default: '' },
    rating: { type: Number, default: null },
    userRatingCount: { type: Number, default: null },
    types: [{ type: String }],
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    photoUrl: { type: String, default: null },
  },
  { _id: false }
);

const placeSearchCacheSchema = new mongoose.Schema(
  {
    // Normalized (lowercase, trimmed) destination query used as the cache key
    query: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    results: [placeResultSchema],
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Cache entries expire after 30 days, after which a fresh API call will repopulate them
placeSearchCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('PlaceSearchCache', placeSearchCacheSchema);
