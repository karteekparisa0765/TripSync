const express = require("express");
const {
  searchPlaces,
  getPlacePhoto,
  clearPlacesCache,
} = require("../controllers/placesController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/photo", getPlacePhoto);
router.get("/search", protect, searchPlaces);
router.delete("/cache", protect, clearPlacesCache);

module.exports = router;
