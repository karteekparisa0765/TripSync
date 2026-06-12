const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const { calculateBalances } = require('../utils/settlement');

// GET /api/dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const trips = await Trip.find({ members: req.user._id }).populate('members', 'name email');

    let totalExpenses = 0;
    let amountOwed = 0; // user owes others (sum of negative balances belonging to user)
    let amountToReceive = 0; // others owe user (sum of positive balances belonging to user)
    const tripBreakdown = []; // for dashboard chart: spending per trip

    for (const trip of trips) {
      const expenses = await Expense.find({ tripId: trip._id })
        .populate('paidBy', 'name email')
        .populate('splitAmong', 'name email');

      const tripTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
      totalExpenses += tripTotal;

      tripBreakdown.push({
        tripId: trip._id,
        name: trip.name,
        total: Math.round(tripTotal * 100) / 100,
        budget: trip.budget,
      });

      const balances = calculateBalances(trip.members, expenses);
      const userBalance = balances.find((b) => b.userId === userId);

      if (userBalance) {
        if (userBalance.balance > 0) {
          amountToReceive += userBalance.balance;
        } else if (userBalance.balance < 0) {
          amountOwed += Math.abs(userBalance.balance);
        }
      }
    }

    res.status(200).json({
      totalTrips: trips.length,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      amountOwed: Math.round(amountOwed * 100) / 100,
      amountToReceive: Math.round(amountToReceive * 100) / 100,
      tripBreakdown,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
};

module.exports = { getDashboard };
