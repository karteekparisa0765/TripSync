const Trip = require("../models/Trip");
const BucketListItem = require("../models/BucketListItem");
const PlaceSearchCache = require("../models/PlaceSearchCache");
const {
  searchAttractions,
  getPhotoMedia,
} = require("../services/placesService");

const formatBucketItem = (item) => ({
  id: item._id,
  tripId: item.tripId,
  addedBy: item.addedBy,
  placeId: item.placeId,
  name: item.name,
  address: item.address,
  rating: item.rating,
  userRatingCount: item.userRatingCount,
  types: item.types,
  location: item.location,
  photoUrl: item.photoUrl,
  notes: item.notes,
  visited: item.visited,
  createdAt: item.createdAt,
});

const ensureMember = async (tripId, userId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) return { error: { status: 404, message: "Trip not found" } };

  const isMember = trip.members.some((m) => m.toString() === userId.toString());
  if (!isMember)
    return {
      error: { status: 403, message: "You are not a member of this trip" },
    };

  return { trip };
};

// GET /api/places/search?destination=Goa
const searchPlaces = async (req, res) => {
  try {
    const { destination } = req.query;

    if (!destination || !destination.trim()) {
      return res
        .status(400)
        .json({ message: "destination query parameter is required" });
    }

    const { results, fromCache } = await searchAttractions(destination);

    res.status(200).json({ destination, results, fromCache });
  } catch (err) {
    console.error("Search places error:", err);

    if (err.message.includes("GOOGLE_PLACES_API_KEY")) {
      return res.status(503).json({
        message:
          "Places search is not configured on the server. Please set GOOGLE_PLACES_API_KEY.",
      });
    }

    res
      .status(502)
      .json({
        message: "Failed to fetch attractions. Please try again later.",
      });
  }
};

// GET /api/places/photo?name=places/...
const getPlacePhoto = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res
        .status(400)
        .json({ message: "name query parameter is required" });
    }

    const { buffer, contentType } = await getPhotoMedia(name);

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400, immutable");
    res.status(200).send(buffer);
  } catch (err) {
    console.error("Place photo error:", err.message);
    res.status(404).json({ message: "Photo is unavailable" });
  }
};

// DELETE /api/places/cache?destination=goa  (omit destination to clear ALL entries)
// Flushes stale cached search results so the next search hits the live API.
const clearPlacesCache = async (req, res) => {
  try {
    const { destination } = req.query;
    let deleted;
    if (destination && destination.trim()) {
      const query = destination.trim().toLowerCase();
      const result = await PlaceSearchCache.deleteOne({ query });
      deleted = result.deletedCount;
      console.log(
        `[places-cache] Cleared cache for "${query}" (${deleted} entry removed)`,
      );
    } else {
      const result = await PlaceSearchCache.deleteMany({});
      deleted = result.deletedCount;
      console.log(
        `[places-cache] Cleared ALL cache entries (${deleted} removed)`,
      );
    }
    res.status(200).json({ message: `Cleared ${deleted} cache entry/entries` });
  } catch (err) {
    console.error("Clear places cache error:", err);
    res.status(500).json({ message: "Failed to clear places cache" });
  }
};

// GET /api/trips/:id/bucket-list
const getBucketList = async (req, res) => {
  try {
    const tripId = req.params.id;

    const { error } = await ensureMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const items = await BucketListItem.find({ tripId }).sort({ createdAt: -1 });

    res.status(200).json({ items: items.map(formatBucketItem) });
  } catch (err) {
    console.error("Get bucket list error:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching bucket list" });
  }
};

// POST /api/trips/:id/bucket-list
const addBucketListItem = async (req, res) => {
  try {
    const tripId = req.params.id;
    const {
      placeId,
      name,
      address,
      rating,
      userRatingCount,
      types,
      location,
      photoUrl,
      notes,
    } = req.body;

    if (!placeId || !name) {
      return res.status(400).json({ message: "placeId and name are required" });
    }

    const { error } = await ensureMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const existing = await BucketListItem.findOne({ tripId, placeId });
    if (existing) {
      return res
        .status(409)
        .json({ message: "This place is already in the bucket list" });
    }

    const item = await BucketListItem.create({
      tripId,
      addedBy: req.user._id,
      placeId,
      name,
      address: address || "",
      rating: typeof rating === "number" ? rating : null,
      userRatingCount:
        typeof userRatingCount === "number" ? userRatingCount : null,
      types: Array.isArray(types) ? types : [],
      location: {
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      },
      photoUrl: photoUrl || null,
      notes: notes || "",
    });

    res.status(201).json({ item: formatBucketItem(item) });
  } catch (err) {
    console.error("Add bucket list item error:", err);

    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "This place is already in the bucket list" });
    }

    res
      .status(500)
      .json({ message: "Server error while adding bucket list item" });
  }
};

// PUT /api/bucket-list/:itemId
const updateBucketListItem = async (req, res) => {
  try {
    const item = await BucketListItem.findById(req.params.itemId);
    if (!item)
      return res.status(404).json({ message: "Bucket list item not found" });

    const { error } = await ensureMember(item.tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const { notes, visited } = req.body;

    if (notes !== undefined) item.notes = notes;
    if (visited !== undefined) item.visited = Boolean(visited);

    await item.save();

    res.status(200).json({ item: formatBucketItem(item) });
  } catch (err) {
    console.error("Update bucket list item error:", err);
    res
      .status(500)
      .json({ message: "Server error while updating bucket list item" });
  }
};

// DELETE /api/bucket-list/:itemId
const removeBucketListItem = async (req, res) => {
  try {
    const item = await BucketListItem.findById(req.params.itemId);
    if (!item)
      return res.status(404).json({ message: "Bucket list item not found" });

    const { error } = await ensureMember(item.tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    await item.deleteOne();

    res.status(200).json({ message: "Removed from bucket list" });
  } catch (err) {
    console.error("Remove bucket list item error:", err);
    res
      .status(500)
      .json({ message: "Server error while removing bucket list item" });
  }
};

module.exports = {
  searchPlaces,
  getPlacePhoto,
  clearPlacesCache,
  getBucketList,
  addBucketListItem,
  updateBucketListItem,
  removeBucketListItem,
};
