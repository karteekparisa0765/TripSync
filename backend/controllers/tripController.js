const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const User = require('../models/User');
const BucketListItem = require('../models/BucketListItem');
const ChatMessage = require('../models/ChatMessage');
const { calculateBalances } = require('../utils/settlement');
const { generateTripItinerary } = require('../services/geminiService');

const formatTrip = (trip) => ({
  id: trip._id,
  name: trip.name,
  destination: trip.destination,
  createdBy: trip.createdBy,
  members: trip.members,
  budget: trip.budget,
  startDate: trip.startDate,
  endDate: trip.endDate,
  itinerary: trip.itinerary,
  createdAt: trip.createdAt,
});

const EPSILON = 0.01;
const ITINERARY_COOLDOWN_MS = 60 * 1000;
const itineraryCooldowns = new Map();

// POST /api/trips
const createTrip = async (req, res) => {
  try {
    const { name, budget, destination, startDate, endDate } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Trip name is required' });
    }

    if (budget !== undefined && budget !== null && budget !== '' && Number(budget) < 0) {
      return res.status(400).json({ message: 'Budget cannot be negative' });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    const trip = await Trip.create({
      name,
      destination: destination ? destination.trim() : '',
      createdBy: req.user._id,
      members: [req.user._id],
      budget: budget === undefined || budget === null || budget === '' ? null : Number(budget),
      startDate: startDate || null,
      endDate: endDate || null,
    });

    const populated = await trip.populate('members', 'name email');

    res.status(201).json({ trip: formatTrip(populated) });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ message: 'Server error while creating trip' });
  }
};

// GET /api/trips
const getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ members: req.user._id })
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ trips: trips.map(formatTrip) });
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ message: 'Server error while fetching trips' });
  }
};

// GET /api/trips/:id
const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate('members', 'name email');

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const isMember = trip.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip' });
    }

    res.status(200).json({ trip: formatTrip(trip) });
  } catch (err) {
    console.error('Get trip error:', err);
    res.status(500).json({ message: 'Server error while fetching trip' });
  }
};

// PUT /api/trips/:id
// Update trip name, destination, dates, and/or budget. Any member can update for now (MVP scope).
const updateTrip = async (req, res) => {
  try {
    const { name, budget, destination, startDate, endDate } = req.body;

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const isMember = trip.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip' });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'Trip name cannot be empty' });
      }
      trip.name = name;
    }

    if (destination !== undefined) {
      trip.destination = destination.trim();
    }

    if (budget !== undefined) {
      if (budget === null || budget === '') {
        trip.budget = null;
      } else {
        if (Number(budget) < 0) {
          return res.status(400).json({ message: 'Budget cannot be negative' });
        }
        trip.budget = Number(budget);
      }
    }

    if (startDate !== undefined) {
      trip.startDate = startDate || null;
    }

    if (endDate !== undefined) {
      trip.endDate = endDate || null;
    }

    if (trip.startDate && trip.endDate && trip.startDate > trip.endDate) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    await trip.save();
    const populated = await trip.populate('members', 'name email');

    res.status(200).json({ trip: formatTrip(populated) });
  } catch (err) {
    console.error('Update trip error:', err);
    res.status(500).json({ message: 'Server error while updating trip' });
  }
};

// GET /api/trips/:id/itinerary
const getItinerary = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate('members', 'name email');
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const isMember = trip.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'You are not a member of this trip' });

    res.status(200).json({ itinerary: trip.itinerary || null });
  } catch (err) {
    console.error('Get itinerary error:', err);
    res.status(500).json({ message: 'Server error while fetching itinerary' });
  }
};

// POST /api/trips/:id/itinerary
const createItinerary = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const now = Date.now();
    const lastRun = itineraryCooldowns.get(userId) || 0;

    if (now - lastRun < ITINERARY_COOLDOWN_MS) {
      return res.status(429).json({ message: 'Please wait a minute before generating again.' });
    }

    const trip = await Trip.findById(req.params.id).populate('members', 'name email');
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const isMember = trip.members.some((m) => m._id.toString() === userId);
    if (!isMember) return res.status(403).json({ message: 'You are not a member of this trip' });

    itineraryCooldowns.set(userId, now);

    const [bucketListItems, expenses] = await Promise.all([
      BucketListItem.find({ tripId: trip._id }).sort({ createdAt: 1 }),
      Expense.find({ tripId: trip._id }),
    ]);

    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const content = await generateTripItinerary({
      trip,
      bucketListItems,
      totalSpent: Math.round(totalSpent * 100) / 100,
      preferences: req.body?.preferences || '',
    });

    trip.itinerary = {
      generatedAt: new Date(),
      content,
    };
    await trip.save();

    res.status(200).json({ itinerary: trip.itinerary });
  } catch (err) {
    console.error('Create itinerary error:', err);

    if (err.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({
        message: 'AI itinerary generation is not configured. Please set GEMINI_API_KEY.',
      });
    }

    res.status(502).json({ message: 'Failed to generate itinerary. Please try again later.' });
  }
};

// DELETE /api/trips/:id
// Only the creator can delete a trip. Cascades to delete all related expenses.
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    if (trip.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the trip creator can delete this trip' });
    }

    await Expense.deleteMany({ tripId: trip._id });
    await BucketListItem.deleteMany({ tripId: trip._id });
    await ChatMessage.deleteMany({ tripId: trip._id });
    await trip.deleteOne();

    res.status(200).json({ message: 'Trip and its expenses deleted successfully' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ message: 'Server error while deleting trip' });
  }
};

// POST /api/trips/:id/members
const addMember = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const isMember = trip.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip' });
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    const alreadyMember = trip.members.some((m) => m.toString() === userToAdd._id.toString());
    if (alreadyMember) {
      return res.status(409).json({ message: 'User is already a member of this trip' });
    }

    trip.members.push(userToAdd._id);
    await trip.save();

    const populated = await trip.populate('members', 'name email');

    res.status(200).json({ trip: formatTrip(populated) });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ message: 'Server error while adding member' });
  }
};

/**
 * Shared logic for removing a member from a trip.
 * Refuses if the member has a non-zero balance (would break settlement history),
 * if they're the trip creator, or if they're the last remaining member.
 */
const removeMemberFromTrip = async (trip, memberIdToRemove) => {
  const isMember = trip.members.some((m) => m.toString() === memberIdToRemove.toString());
  if (!isMember) {
    return { error: { status: 404, message: 'User is not a member of this trip' } };
  }

  if (trip.createdBy.toString() === memberIdToRemove.toString()) {
    return {
      error: {
        status: 400,
        message: 'The trip creator cannot be removed. Delete the trip instead.',
      },
    };
  }

  if (trip.members.length <= 1) {
    return { error: { status: 400, message: 'Cannot remove the last member of a trip' } };
  }

  const expenses = await Expense.find({ tripId: trip._id })
    .populate('paidBy', 'name email')
    .populate('splitAmong', 'name email');

  const populatedTrip = await trip.populate('members', 'name email');
  const balances = calculateBalances(populatedTrip.members, expenses);
  const memberBalance = balances.find((b) => b.userId === memberIdToRemove.toString());

  if (memberBalance && Math.abs(memberBalance.balance) > EPSILON) {
    return {
      error: {
        status: 400,
        message:
          'This member has an outstanding balance and cannot be removed until they are settled up.',
      },
    };
  }

  trip.members = trip.members.filter((m) => m.toString() !== memberIdToRemove.toString());
  await trip.save();

  return { success: true };
};

// DELETE /api/trips/:id/members/:userId
// Remove a member from the trip (e.g. trip creator removing someone, or admin cleanup).
const removeMember = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const isRequesterMember = trip.members.some((m) => m.toString() === req.user._id.toString());
    if (!isRequesterMember) {
      return res.status(403).json({ message: 'You are not a member of this trip' });
    }

    const { error } = await removeMemberFromTrip(trip, req.params.userId);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const populated = await trip.populate('members', 'name email');
    res.status(200).json({ trip: formatTrip(populated) });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ message: 'Server error while removing member' });
  }
};

// POST /api/trips/:id/leave
// A member removes themselves from the trip.
const leaveTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const { error } = await removeMemberFromTrip(trip, req.user._id);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    res.status(200).json({ message: 'You have left the trip' });
  } catch (err) {
    console.error('Leave trip error:', err);
    res.status(500).json({ message: 'Server error while leaving trip' });
  }
};

module.exports = {
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
};
