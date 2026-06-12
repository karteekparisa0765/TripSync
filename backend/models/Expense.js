const mongoose = require('mongoose');
const { EXPENSE_CATEGORIES, DEFAULT_CATEGORY } = require('../utils/categories');

const expenseSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    splitAmong: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    date: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      default: DEFAULT_CATEGORY,
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
