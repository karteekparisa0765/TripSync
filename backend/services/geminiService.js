const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toISOString().slice(0, 10);
};

const buildItineraryPrompt = ({ trip, bucketListItems, totalSpent, preferences }) => {
  const bucketListText =
    bucketListItems.length > 0
      ? bucketListItems
          .map((item, index) => {
            const note = item.notes ? ` Notes: ${item.notes}.` : '';
            const visited = item.visited ? ' Already visited.' : '';
            return `${index + 1}. ${item.name}${item.address ? `, ${item.address}` : ''}.${note}${visited}`;
          })
          .join('\n')
      : 'No bucket-list places have been added yet.';

  return `
Create a practical day-by-day travel itinerary for this trip.

Trip name: ${trip.name}
Destination: ${trip.destination || 'Not set'}
Start date: ${formatDate(trip.startDate)}
End date: ${formatDate(trip.endDate)}
Budget: ${trip.budget == null ? 'Not set' : `INR ${trip.budget}`}
Already recorded expenses: INR ${totalSpent}
Group size: ${trip.members.length}
User preferences: ${preferences || 'None'}

Bucket list:
${bucketListText}

Return concise markdown with:
- A short overview
- Day-by-day morning, afternoon, evening plan
- Budget notes
- Travel tips
Prioritize bucket-list items, avoid already visited items unless useful context, and keep the plan realistic.
`.trim();
};

const extractText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('\n').trim();
};

const generateTripItinerary = async ({ trip, bucketListItems, totalSpent, preferences }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const prompt = buildItineraryPrompt({ trip, bucketListItems, totalSpent, preferences });
  const url = `${GEMINI_API_BASE}/models/${DEFAULT_GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1600,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini API error:', response.status, errorBody);
    throw new Error('Failed to generate itinerary with Gemini');
  }

  const data = await response.json();
  const text = extractText(data);

  if (!text) {
    throw new Error('Gemini returned an empty itinerary');
  }

  return text;
};

module.exports = { generateTripItinerary };
