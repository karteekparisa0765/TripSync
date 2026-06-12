const express = require('express');
const { searchPlaces, getPlacePhoto } = require('../controllers/placesController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/photo', getPlacePhoto);
router.get('/search', protect, searchPlaces);

module.exports = router;
