const express = require('express');
const { updateBucketListItem, removeBucketListItem } = require('../controllers/placesController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.put('/:itemId', updateBucketListItem);
router.delete('/:itemId', removeBucketListItem);

module.exports = router;
