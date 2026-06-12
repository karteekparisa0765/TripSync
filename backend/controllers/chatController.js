const Trip = require('../models/Trip');
const ChatMessage = require('../models/ChatMessage');

const formatMessage = (message) => ({
  id: message._id,
  tripId: message.tripId,
  sender: message.sender,
  message: message.message,
  createdAt: message.createdAt,
});

const ensureTripMember = async (tripId, userId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) return { error: { status: 404, message: 'Trip not found' } };

  const isMember = trip.members.some((memberId) => memberId.toString() === userId.toString());
  if (!isMember) return { error: { status: 403, message: 'You are not a member of this trip' } };

  return { trip };
};

// GET /api/trips/:id/chat
const getTripMessages = async (req, res) => {
  try {
    const tripId = req.params.id;
    const { error } = await ensureTripMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const messages = await ChatMessage.find({ tripId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .limit(200);

    res.status(200).json({ messages: messages.map(formatMessage) });
  } catch (err) {
    console.error('Get chat messages error:', err);
    res.status(500).json({ message: 'Server error while fetching chat messages' });
  }
};

// POST /api/trips/:id/chat
const sendTripMessage = async (req, res) => {
  try {
    const tripId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message must be 1000 characters or fewer' });
    }

    const { error } = await ensureTripMember(tripId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const created = await ChatMessage.create({
      tripId,
      sender: req.user._id,
      message: message.trim(),
    });

    const populated = await created.populate('sender', 'name email');
    res.status(201).json({ message: formatMessage(populated) });
  } catch (err) {
    console.error('Send chat message error:', err);
    res.status(500).json({ message: 'Server error while sending chat message' });
  }
};

module.exports = { getTripMessages, sendTripMessage };
