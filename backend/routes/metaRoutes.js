const express = require('express');
const { EXPENSE_CATEGORIES } = require('../utils/categories');

const router = express.Router();

// GET /api/meta/categories
router.get('/categories', (req, res) => {
  res.status(200).json({ categories: EXPENSE_CATEGORIES });
});

module.exports = router;
