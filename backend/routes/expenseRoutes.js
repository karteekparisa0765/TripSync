const express = require('express');
const { updateExpense, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
