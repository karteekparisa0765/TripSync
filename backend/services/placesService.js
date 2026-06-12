const PlaceSearchCache = require('../models/PlaceSearchCache');

const PLACES_API_BASE = 'https://places.googleapis.com/v1/places:searchText';
const PHOTO_API_BASE = 'https://places.googleapis.com/v1';

// Fields requested from the Places API (New) — keep this list minimal to control cost.
// See: https://developers.google.com/maps/documentation/places/web-service/text-search
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.location',
  'places.photos',
].join(',');

/**
 * Build a photo URL for a place photo resource name returned by the Places API.
 * The actual binary is fetched by the client/browser using this URL + API key.
 */
const buildPhotoUrl = (photoName) => {
  if (!photoName) return null;
  // photoName looks like: "places/PLACE_ID/photos/PHOTO_RESOURCE".
  // Route through our backend so the Google API key stays server-side.
  return `/api/places/photo?name=${encodeURIComponent(photoName)}`;
};

/**
 * Map a raw Places API (New) place object to our simplified shape.
 */
const mapPlace = (place) => ({
  placeId: place.id,
  name: place.displayName?.text || 'Unnamed place',
  address: place.formattedAddress || '',
  rating: typeof place.rating === 'number' ? place.rating : null,
  userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
  types: Array.isArray(place.types) ? place.types : [],
  location: {
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
  },
  photoUrl:
    Array.isArray(place.photos) && place.photos.length > 0
      ? buildPhotoUrl(place.photos[0].name)
      : null,
});

/**
 * Search for tourist attractions in a given destination using Google Places Text Search (New).
 * Results are cached in MongoDB for 30 days to reduce API usage.
 *
 * @param {string} destination - e.g. "Goa", "Manali", "Paris"
 * @returns {Promise<{ results: Array, fromCache: boolean }>}
 */
const searchAttractions = async (destination) => {
  const normalizedQuery = destination.trim().toLowerCase();

  if (!normalizedQuery) {
    throw new Error('Destination is required for place search');
  }

  // 1. Check cache first
  const cached = await PlaceSearchCache.findOne({ query: normalizedQuery });
  if (cached) {
    return { results: cached.results, fromCache: true };
  }

  // 2. Call Google Places API (New) - Text Search
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured on the server');
  }

  const response = await fetch(PLACES_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `top tourist attractions in ${destination}`,
      maxResultCount: 12,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google Places API error:', response.status, errorBody);
    throw new Error('Failed to fetch attractions from Google Places API');
  }

  const data = await response.json();
  const places = Array.isArray(data.places) ? data.places : [];
  const results = places.map((place) => mapPlace(place));

  // 3. Store in cache (best-effort; don't fail the request if caching fails)
  try {
    await PlaceSearchCache.create({
      query: normalizedQuery,
      results,
      fetchedAt: new Date(),
    });
  } catch (cacheErr) {
    // Duplicate key races are possible under concurrent requests; ignore.
    console.warn('Could not cache place search results:', cacheErr.message);
  }

  return { results, fromCache: false };
};

const getPhotoMediaUrl = async (photoName) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured on the server');
  }

  if (!photoName || !photoName.startsWith('places/')) {
    throw new Error('Invalid Google Places photo name');
  }

  const response = await fetch(
    `${PHOTO_API_BASE}/${photoName}/media?maxWidthPx=600&skipHttpRedirect=true&key=${apiKey}`
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google Places photo error:', response.status, errorBody);
    throw new Error('Failed to fetch photo from Google Places API');
  }

  const data = await response.json();
  return data.photoUri;
};

module.exports = { searchAttractions, getPhotoMediaUrl };
