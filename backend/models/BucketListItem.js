const mongoose = require('mongoose');

const bucketListItemSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    placeId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      default: null,
    },
    userRatingCount: {
      type: Number,
      default: null,
    },
    types: [
      {
        type: String,
      },
    ],
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    photoUrl: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    visited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent the same place being added twice to the same trip
bucketListItemSchema.index({ tripId: 1, placeId: 1 }, { unique: true });

module.exports = mongoose.model('BucketListItem', bucketListItemSchema);
