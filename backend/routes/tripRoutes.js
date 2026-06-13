const express = require('express');
const {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  addMember,
  removeMember,
  leaveTrip,
  getItinerary,
  createItinerary,
  createAssistantResponse,
} = require('../controllers/tripController');
const {
  addExpense,
  getExpenses,
  getSettlement,
  getExpenseStats,
} = require('../controllers/expenseController');
const { getBucketList, addBucketListItem } = require('../controllers/placesController');
const { getTripMessages, sendTripMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createTrip);
router.get('/', getMyTrips);
router.get('/:id', getTripById);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/leave', leaveTrip);
router.get('/:id/itinerary', getItinerary);
router.post('/:id/itinerary', createItinerary);
router.post('/:id/assistant', createAssistantResponse);
router.get('/:id/chat', getTripMessages);
router.post('/:id/chat', sendTripMessage);

// Nested expense routes
router.post('/:id/expenses', addExpense);
router.get('/:id/expenses', getExpenses);
router.get('/:id/settlement', getSettlement);
router.get('/:id/stats', getExpenseStats);

// Nested bucket-list routes
router.get('/:id/bucket-list', getBucketList);
router.post('/:id/bucket-list', addBucketListItem);

module.exports = router;
