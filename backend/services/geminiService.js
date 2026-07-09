const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS &&
  process.env.GEMINI_FALLBACK_MODELS.split(",")) || [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

const formatDate = (value) => {
  if (!value) return "Not set";
  return new Date(value).toISOString().slice(0, 10);
};

const buildItineraryPrompt = ({
  trip,
  bucketListItems,
  totalSpent,
  preferences,
}) => {
  const bucketListText =
    bucketListItems.length > 0
      ? bucketListItems
          .map((item, index) => {
            const note = item.notes ? ` Notes: ${item.notes}.` : "";
            const visited = item.visited ? " Already visited." : "";
            return `${index + 1}. ${item.name}${item.address ? `, ${item.address}` : ""}.${note}${visited}`;
          })
          .join("\n")
      : "No bucket-list places have been added yet.";

  return `
Create a practical day-by-day travel itinerary for this trip.

Trip name: ${trip.name}
Destination: ${trip.destination || "Not set"}
Start date: ${formatDate(trip.startDate)}
End date: ${formatDate(trip.endDate)}
Budget: ${trip.budget == null ? "Not set" : `INR ${trip.budget}`}
Already recorded expenses: INR ${totalSpent}
Group size: ${trip.members.length}
User preferences: ${preferences || "None"}

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
  return parts
    .map((part) => part.text || "")
    .join("\n")
    .trim();
};

// Removes residual markdown formatting (bold, headers, bullet symbols) from
// plain-text assistant responses, in case the model ignores formatting instructions.
// Skips content inside fenced code blocks (```...```) and inline code (`...`)
// so code samples in the response aren't corrupted.
const stripMarkdown = (text = "") => {
  // Split on fenced code blocks first, preserving them untouched.
  const segments = text.split(/(```[\s\S]*?```)/g);

  const stripSegment = (segment) => {
    // Preserve inline code spans, strip everything else.
    const inlineParts = segment.split(/(`[^`\n]*`)/g);
    return inlineParts
      .map((part, idx) => {
        // Odd indices (1, 3, 5...) are inline code spans -> leave untouched
        if (idx % 2 === 1) return part;
        return part
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/__(.*?)__/g, "$1")
          .replace(/^#{1,6}\s*/gm, "")
          .replace(/^[ \t]*[-*]\s+/gm, "")
          .replace(/\*/g, "");
      })
      .join("");
  };

  return segments
    .map((segment, idx) => {
      // Odd indices are fenced code blocks -> leave untouched
      if (idx % 2 === 1) return segment;
      return stripSegment(segment);
    })
    .join("")
    .trim();
};

// Helper: call Gemini with retries and optional fallback models
const callGeminiWithRetries = async ({ prompt, maxOutputTokens = 800 }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    throw new Error("GEMINI_API_KEY is not configured on the server");

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens,
    },
  };

  const modelsToTry = [
    DEFAULT_GEMINI_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== DEFAULT_GEMINI_MODEL),
  ];
  const maxAttemptsPerModel = 3;

  for (const model of modelsToTry) {
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          let parsed;
          try {
            parsed = JSON.parse(errorBody);
          } catch (e) {
            parsed = null;
          }
          console.error(
            "Gemini API error for model",
            model,
            response.status,
            parsed || errorBody,
          );

          if (response.status === 429 || response.status === 503) {
            // Try to extract retry delay from response details
            let waitMs = Math.min(5000 * attempt, 30000);
            const retryInfo = parsed?.error?.details?.find(
              (d) => d["@type"] && d["@type"].includes("RetryInfo"),
            );
            if (retryInfo && retryInfo.retryDelay) {
              const match = /([0-9]+)s/.exec(retryInfo.retryDelay);
              if (match) waitMs = parseInt(match[1], 10) * 1000;
            }
            console.warn(
              `Model ${model} returned ${response.status}. attempt ${attempt}/${maxAttemptsPerModel}. waiting ${waitMs}ms`,
            );
            await new Promise((r) => setTimeout(r, waitMs));
            continue; // retry same model
          }

          // non-retryable for this model -> break to try next model
          break;
        }

        const data = await response.json();
        const text = extractText(data);
        if (!text) {
          console.error("Gemini returned empty text for model", model);
          break; // try next model
        }
        if (model !== DEFAULT_GEMINI_MODEL)
          console.info("Gemini succeeded with fallback model", model);
        return text;
      } catch (err) {
        console.error(
          `Error calling Gemini model ${model} (attempt ${attempt}):`,
          err.message || err,
        );
        const backoff = Math.min(5000 * attempt, 30000);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    console.warn("All attempts failed for model", model);
  }

  throw new Error(
    "Failed to get response from Gemini after trying configured models",
  );
};

const buildAssistantPrompt = ({
  trip,
  bucketListItems,
  itinerary,
  question,
}) => {
  const bucketListText =
    bucketListItems.length > 0
      ? bucketListItems
          .map((item, index) => {
            const note = item.notes ? ` Notes: ${item.notes}.` : "";
            const visited = item.visited ? " Already visited." : "";
            return `${index + 1}. ${item.name}${item.address ? `, ${item.address}` : ""}.${note}${visited}`;
          })
          .join("\n")
      : "None saved yet.";

  const itineraryText = itinerary?.content
    ? itinerary.content
    : "None generated yet.";

  return `You are a general-purpose AI assistant, just like ChatGPT. Your default mode is to answer the user's message directly and naturally on whatever topic it's about: general knowledge, explanations, definitions, advice, coding, math, conversation, or anything else. There is no restriction on subject matter, and you should behave exactly as a standard general AI assistant would for any message that isn't clearly about the user's trip.

STRICT RULES (apply these first, before reading any trip context below):
1. Default to completely ignoring the trip context section. It is supplementary and most messages have nothing to do with it.
2. Only use the trip context if the user's message clearly asks about their trip, itinerary, budget, bucket list, or destination, or explicitly references "my trip", "this trip", "our plan", or similar.
3. If the message is a general question unrelated to the trip (definitions, facts, how-to, coding, math, advice, casual conversation, etc.), answer it exactly as a general AI assistant would, with zero reference to the trip, itinerary, or bucket list.
4. Never say things like "I don't have that information" or "this isn't in your itinerary" for questions that don't need the trip context in the first place.
5. Never volunteer trip details unprompted, and never let the presence of trip context change your answer to an unrelated question.

FORMATTING RULES:
- Give a complete, well-organized answer. Never cut off mid-sentence or mid-list.
- Write in plain text only: no markdown symbols (no **, ##, *, -, or _). For lists, use numbered sentences like "1. ..." on separate lines.
- Exception: if the user asks for code, you may use normal code formatting (including fenced code blocks), since code requires it.
- Be concise but complete: aim for under 250 words unless the question genuinely needs more detail.

USER'S MESSAGE (this is what you are responding to):
${question}

----
OPTIONAL TRIP CONTEXT (only relevant if the rules above say to use it):
- Trip name: ${trip.name}
- Destination: ${trip.destination || "Not set"}
- Dates: ${formatDate(trip.startDate)} to ${formatDate(trip.endDate)}
- Budget: ${trip.budget == null ? "Not set" : `INR ${trip.budget}`}
- Group size: ${trip.members.length}
- Bucket list: ${bucketListText}
- Itinerary: ${itineraryText}
----

Respond now to the user's message following the rules above.`.trim();
};

const generateTripItinerary = async ({
  trip,
  bucketListItems,
  totalSpent,
  preferences,
}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const prompt = buildItineraryPrompt({
    trip,
    bucketListItems,
    totalSpent,
    preferences,
  });
  try {
    const text = await callGeminiWithRetries({ prompt, maxOutputTokens: 1600 });
    return text;
  } catch (err) {
    // Surface friendlier messages for common cases
    if (err.message && err.message.toLowerCase().includes("quota")) {
      throw new Error(
        "Too many requests to Gemini API. Please wait a moment and try again.",
      );
    }
    throw err;
  }
};

const generateTripAssistantResponse = async ({
  trip,
  bucketListItems,
  itinerary,
  question,
}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const prompt = buildAssistantPrompt({
    trip,
    bucketListItems,
    itinerary,
    question,
  });
  try {
    const text = await callGeminiWithRetries({ prompt, maxOutputTokens: 2048 });
    return stripMarkdown(text);
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("Too many requests") ||
        err.message.toLowerCase().includes("quota") ||
        err.message.toLowerCase().includes("overloaded") ||
        err.message.toLowerCase().includes("high demand"))
    ) {
      throw new Error(
        "Too many requests to Gemini API. Please wait a moment and try again.",
      );
    }
    throw err;
  }
};

module.exports = { generateTripItinerary, generateTripAssistantResponse };
