const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS && process.env.GEMINI_FALLBACK_MODELS.split(',')) || ['gemini-2.5-flash', 'gemini-2.0-flash'];

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

// Helper: call Gemini with retries and optional fallback models
const callGeminiWithRetries = async ({ prompt, maxOutputTokens = 800 }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server');

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens,
    },
  };

  const modelsToTry = [DEFAULT_GEMINI_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_GEMINI_MODEL)];
  const maxAttemptsPerModel = 3;

  for (const model of modelsToTry) {
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          let parsed;
          try { parsed = JSON.parse(errorBody); } catch (e) { parsed = null; }
          console.error('Gemini API error for model', model, response.status, parsed || errorBody);

          if (response.status === 429 || response.status === 503) {
            // Try to extract retry delay from response details
            let waitMs = Math.min(5000 * attempt, 30000);
            const retryInfo = parsed?.error?.details?.find((d) => d['@type'] && d['@type'].includes('RetryInfo'));
            if (retryInfo && retryInfo.retryDelay) {
              const match = /([0-9]+)s/.exec(retryInfo.retryDelay);
              if (match) waitMs = parseInt(match[1], 10) * 1000;
            }
            console.warn(`Model ${model} returned ${response.status}. attempt ${attempt}/${maxAttemptsPerModel}. waiting ${waitMs}ms`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue; // retry same model
          }

          // non-retryable for this model -> break to try next model
          break;
        }

        const data = await response.json();
        const text = extractText(data);
        if (!text) {
          console.error('Gemini returned empty text for model', model);
          break; // try next model
        }
        if (model !== DEFAULT_GEMINI_MODEL) console.info('Gemini succeeded with fallback model', model);
        return text;
      } catch (err) {
        console.error(`Error calling Gemini model ${model} (attempt ${attempt}):`, err.message || err);
        const backoff = Math.min(5000 * attempt, 30000);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    console.warn('All attempts failed for model', model);
  }

  throw new Error('Failed to get response from Gemini after trying configured models');
};

const buildAssistantPrompt = ({ trip, bucketListItems, itinerary, question }) => {
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

  const itineraryText = itinerary?.content
    ? `Current itinerary:\n${itinerary.content}`
    : 'No itinerary has been generated yet.';

  return `You are a helpful travel planning assistant. Use the trip details below to answer the user's question clearly and keep the response grounded in the user's bucket list, itinerary, and trip information.

Trip name: ${trip.name}
Destination: ${trip.destination || 'Not set'}
Start date: ${formatDate(trip.startDate)}
End date: ${formatDate(trip.endDate)}
Budget: ${trip.budget == null ? 'Not set' : `INR ${trip.budget}`}
Group size: ${trip.members.length}

Bucket list:
${bucketListText}

${itineraryText}

Question: ${question}

Important: Use the trip's *Bucket List* (saved places) and the current itinerary as the only source of place recommendations — do not rely on or reference any separate Places search UI. Answer the question directly. If the user asks for suggestions, make recommendations that prioritize the bucket list items and the current itinerary. If information is missing, explain what is needed and offer useful next steps.`.trim();
};

const generateTripItinerary = async ({ trip, bucketListItems, totalSpent, preferences }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const prompt = buildItineraryPrompt({ trip, bucketListItems, totalSpent, preferences });
  try {
    const text = await callGeminiWithRetries({ prompt, maxOutputTokens: 1600 });
    return text;
  } catch (err) {
    // Surface friendlier messages for common cases
    if (err.message && err.message.toLowerCase().includes('quota')) {
      throw new Error('Too many requests to Gemini API. Please wait a moment and try again.');
    }
    throw err;
  }
};

const generateTripAssistantResponse = async ({ trip, bucketListItems, itinerary, question }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const prompt = buildAssistantPrompt({ trip, bucketListItems, itinerary, question });
  try {
    const text = await callGeminiWithRetries({ prompt, maxOutputTokens: 800 });
    return text;
  } catch (err) {
    if (err.message && (err.message.includes('Too many requests') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('overloaded') || err.message.toLowerCase().includes('high demand'))) {
      throw new Error('Too many requests to Gemini API. Please wait a moment and try again.');
    }
    throw err;
  }
};

module.exports = { generateTripItinerary, generateTripAssistantResponse };
