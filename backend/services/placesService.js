const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_DETAILS_BASE = "https://places.googleapis.com/v1/places";
const PHOTO_API_BASE = "https://places.googleapis.com/v1";
const MAX_RESULTS = 8;

const buildPhotoUrl = (photoName) => {
  if (!photoName) return null;
  return `/api/places/photo?name=${encodeURIComponent(photoName)}`;
};

/**
 * Fetch full place details (including photos) for a single place ID.
 * Text Search doesn't reliably return photos — Place Details does.
 */
const fetchPlaceDetails = async (placeId, apiKey) => {
  try {
    const url = `${PLACES_DETAILS_BASE}/${placeId}`;
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,photos.name,photos.widthPx,photos.heightPx",
      },
    });

    if (!response.ok) {
      console.warn(`[places-details] ${placeId} -> ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(
      `[places-details] ${placeId} -> photos: ${JSON.stringify(data.photos || []).slice(0, 200)}`,
    );
    return data;
  } catch (err) {
    console.warn(`[places-details] fetch failed for ${placeId}:`, err.message);
    return null;
  }
};

const mapPlace = (searchResult, details) => {
  const photos = Array.isArray(details?.photos) ? details.photos : [];
  const firstPhoto = photos[0];
  const photoResourceName = firstPhoto?.name ?? null;

  return {
    placeId: searchResult.id,
    name: searchResult.displayName?.text || "Unnamed place",
    address: searchResult.formattedAddress || "",
    rating:
      typeof searchResult.rating === "number" ? searchResult.rating : null,
    userRatingCount:
      typeof searchResult.userRatingCount === "number"
        ? searchResult.userRatingCount
        : null,
    types: Array.isArray(searchResult.types) ? searchResult.types : [],
    location: {
      lat: searchResult.location?.latitude ?? null,
      lng: searchResult.location?.longitude ?? null,
    },
    photoUrl: photoResourceName ? buildPhotoUrl(photoResourceName) : null,
  };
};

/**
 * Search for tourist attractions using Google Places (New) Text Search API,
 * then fetch photos for each result via Place Details.
 * Caching disabled — every call hits the live API.
 */
const searchAttractions = async (destination) => {
  const normalizedQuery = destination.trim().toLowerCase();

  if (!normalizedQuery) {
    throw new Error("Destination is required for place search");
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured on the server");
  }

  console.log(`[places] Searching Google Places for: "${destination}"`);

  // Step 1: Text search — get place IDs, names, addresses, ratings
  const searchResponse = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: `top tourist attractions in ${destination}`,
      maxResultCount: MAX_RESULTS,
      languageCode: "en",
    }),
  });

  if (!searchResponse.ok) {
    const errorBody = await searchResponse.text();
    console.error(
      "[places] Text search error:",
      searchResponse.status,
      errorBody,
    );
    throw new Error("Failed to fetch attractions from Google Places API");
  }

  const searchData = await searchResponse.json();
  const places = Array.isArray(searchData.places) ? searchData.places : [];

  console.log(`[places] Text search returned ${places.length} places`);

  // Step 2: Fetch photos for each place via Place Details (parallel)
  const detailsResults = await Promise.all(
    places.map((place) => fetchPlaceDetails(place.id, apiKey)),
  );

  // Step 3: Map to our shape
  const results = places.map((place, i) => mapPlace(place, detailsResults[i]));

  console.log(
    `[places] Final: ${results.map((r) => `${r.name}=${r.photoUrl ? "HAS_PHOTO" : "null"}`).join(", ")}`,
  );

  return { results, fromCache: false };
};

/**
 * Fetch photo bytes for a Google Places photo resource name.
 */
const getPhotoMedia = async (photoName) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured on the server");
  }

  if (!photoName || !photoName.startsWith("places/")) {
    throw new Error("Invalid Google Places photo name: " + photoName);
  }

  console.log("[places-photo] Fetching:", photoName);

  const metaUrl = `${PHOTO_API_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`;

  const metaResponse = await fetch(metaUrl, {
    headers: { "X-Goog-Api-Key": apiKey },
  });

  if (!metaResponse.ok) {
    const errorBody = await metaResponse.text();
    console.error("[places-photo] Error:", metaResponse.status, errorBody);
    if (metaResponse.status === 403)
      throw new Error("GOOGLE_PLACES_PHOTO_FORBIDDEN");
    if (metaResponse.status === 404)
      throw new Error("GOOGLE_PLACES_PHOTO_NOT_FOUND");
    throw new Error(`Photo metadata fetch failed (${metaResponse.status})`);
  }

  const metaData = await metaResponse.json();
  console.log("[places-photo] Meta:", JSON.stringify(metaData).slice(0, 300));

  const photoUri = metaData?.photoUri;
  if (!photoUri) {
    throw new Error("No photoUri in response: " + JSON.stringify(metaData));
  }

  const imageResponse = await fetch(photoUri);
  if (!imageResponse.ok) {
    throw new Error(`CDN fetch failed (${imageResponse.status})`);
  }

  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await imageResponse.arrayBuffer();

  return { buffer: Buffer.from(arrayBuffer), contentType };
};

module.exports = { searchAttractions, getPhotoMedia };
