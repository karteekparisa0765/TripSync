const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const { calculateBalances, simplifyDebts } = require('../utils/settlement');
const { EXPENSE_CATEGORIES, DEFAULT_CATEGORY } = require('../utils/categories');

const formatExpense = (expense) => ({
  id: expense._id,
  tripId: expense.tripId,
  description: expense.description,
  amount: expense.amount,
  paidBy: expense.paidBy,
  splitAmong: expense.splitAmong,
  date: expense.date,
  category: expense.category,
});

const ensureMember = async (tripId, userId) => {
  const trip = await Trip.findById(tripId).populate('members', 'name email');
  if (!trip) return { error: { status: 404, message: 'Trip not found' } };

  const isMember = trip.members.some((m) => m._id.toString() === userId.toString());
  if (!isMember) return { error: { status: 403, message: 'You are not a member of this trip' } };

  return { trip };
};

// POST /api/trips/:id/expenses
const addExpense = async (req, res) => {
  try {
    const { description, amount, paidBy, splitAmong, date, category } = req.body;
    const tripId = req.params.id;

    if (!description || amount === undefined || !paidBy) {
      return res.status(400).json({ message: 'description, amount, and paidBy are required' });
    }

    const { trip, error } = await ensureMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const memberIds = trip.members.map((m) => m._id.toString());

    if (!memberIds.includes(paidBy.toString())) {
      return res.status(400).json({ message: 'paidBy must be a member of this trip' });
    }

    let split = splitAmong && splitAmong.length > 0 ? splitAmong : memberIds;
    const invalidSplit = split.some((id) => !memberIds.includes(id.toString()));
    if (invalidSplit) {
      return res.status(400).json({ message: 'splitAmong must only contain trip members' });
    }

    if (category !== undefined && category !== null && category !== '' && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
      });
    }

    const expense = await Expense.create({
      tripId,
      description,
      amount,
      paidBy,
      splitAmong: split,
      date: date || Date.now(),
      category: category || DEFAULT_CATEGORY,
    });

    res.status(201).json({ expense: formatExpense(expense) });
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ message: 'Server error while adding expense' });
  }
};

// GET /api/trips/:id/expenses
const getExpenses = async (req, res) => {
  try {
    const tripId = req.params.id;

    const { error } = await ensureMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const expenses = await Expense.find({ tripId })
      .populate('paidBy', 'name email')
      .populate('splitAmong', 'name email')
      .sort({ date: -1 });

    res.status(200).json({ expenses: expenses.map(formatExpense) });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ message: 'Server error while fetching expenses' });
  }
};

// PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const { error, trip } = await ensureMember(expense.tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const memberIds = trip.members.map((m) => m._id.toString());
    const { description, amount, paidBy, splitAmong, date, category } = req.body;

    if (paidBy && !memberIds.includes(paidBy.toString())) {
      return res.status(400).json({ message: 'paidBy must be a member of this trip' });
    }

    if (splitAmong) {
      const invalidSplit = splitAmong.some((id) => !memberIds.includes(id.toString()));
      if (invalidSplit) {
        return res.status(400).json({ message: 'splitAmong must only contain trip members' });
      }
    }

    if (category !== undefined && category !== null && category !== '' && !EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
      });
    }

    if (description !== undefined) expense.description = description;
    if (amount !== undefined) expense.amount = amount;
    if (paidBy !== undefined) expense.paidBy = paidBy;
    if (splitAmong !== undefined) expense.splitAmong = splitAmong;
    if (date !== undefined) expense.date = date;
    if (category !== undefined) expense.category = category;

    await expense.save();

    res.status(200).json({ expense: formatExpense(expense) });
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ message: 'Server error while updating expense' });
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const { error } = await ensureMember(expense.tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    await expense.deleteOne();

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Server error while deleting expense' });
  }
};

// GET /api/trips/:id/settlement
const getSettlement = async (req, res) => {
  try {
    const tripId = req.params.id;

    const { trip, error } = await ensureMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const expenses = await Expense.find({ tripId })
      .populate('paidBy', 'name email')
      .populate('splitAmong', 'name email');

    const balances = calculateBalances(trip.members, expenses);
    const transactions = simplifyDebts(balances);

    res.status(200).json({ balances, transactions });
  } catch (err) {
    console.error('Get settlement error:', err);
    res.status(500).json({ message: 'Server error while calculating settlement' });
  }
};

// GET /api/trips/:id/stats
// Returns data shaped for charts:
//  - byCategory: [{ category, total }]
//  - byDate: [{ date: 'YYYY-MM-DD', total }] sorted chronologically
//  - totalSpent: number
const getExpenseStats = async (req, res) => {
  try {
    const tripId = req.params.id;

    const { error } = await ensureMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const expenses = await Expense.find({ tripId });

    const categoryTotals = {};
    const dateTotals = {};
    let totalSpent = 0;

    expenses.forEach((expense) => {
      totalSpent += expense.amount;

      const cat = expense.category || DEFAULT_CATEGORY;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;

      const dateKey = new Date(expense.date).toISOString().slice(0, 10);
      dateTotals[dateKey] = (dateTotals[dateKey] || 0) + expense.amount;
    });

    const byCategory = Object.entries(categoryTotals)
      .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    const byDate = Object.entries(dateTotals)
      .map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    res.status(200).json({
      totalSpent: Math.round(totalSpent * 100) / 100,
      byCategory,
      byDate,
    });
  } catch (err) {
    console.error('Get expense stats error:', err);
    res.status(500).json({ message: 'Server error while calculating expense stats' });
  }
};

module.exports = {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getSettlement,
  getExpenseStats,
};
