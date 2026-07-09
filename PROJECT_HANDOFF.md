# PROJECT STATUS & HANDOFF NOTES

This file is for whoever picks up this project next.

## 1. Current Status

### Phase 1 MVP - Complete
- JWT auth: register, login, logout, get current user (`/api/auth/*`)
- Trip creation, listing, viewing, adding members by email (`/api/trips/*`)
- Expense CRUD with category, date, paidBy, splitAmong (`/api/trips/:id/expenses`, `/api/expenses/:id`)
- Settlement calculator with greedy debt simplification (`/api/trips/:id/settlement`)
- Dashboard summary (`/api/dashboard`)
- React frontend: Login, Register, Dashboard, TripList, CreateTrip, route-based trip workspace

### UI/UX Refactor - Complete
- [x] Replaced the crowded single Trip Detail page with nested trip routes
- [x] Added responsive app sidebar navigation
- [x] Added in-trip navigation for Overview, Expenses, Settlements, Itinerary, Places, Members, and Analytics
- [x] Added per-trip Group Chat page with persisted messages
- [x] Added top-level Analytics route with trip search/selection and PowerBI-style spending views
- [x] Added top-level Settings route with account, appearance, notifications, API, layout, and security sections
- [x] Moved add/edit forms into modal dialogs
- [x] Added modern overview page with cover image, summary cards, budget widget, quick actions, and recent activity
- [x] Redesigned expenses page with search, category/date filters, sorting, icons, and expense cards
- [x] Redesigned settlements page with payment cards and balance cards
- [x] Redesigned places and itinerary pages
- [x] Redesigned trip cards with cover image, destination, dates, member count, budget progress, and Open Trip action
- [x] Improved dashboard with statistics cards, spending chart, recent trips, upcoming trips, and quick actions
- [x] Added `framer-motion` and `lucide-react` for animation and iconography

### Phase 1/2 Frontend Polish - Mostly Complete
- [x] Trip workspace UI for remove member, leave trip, delete trip, budget input/display
- [x] Trip Analytics uses Recharts pie, line, and bar charts
- [x] Dashboard Recharts spending/budget chart using `tripBreakdown`
- [x] CreateTrip form supports budget, destination, start date, and end date
- [x] Expense category UI uses the backend enum values
- [ ] Input validation library (`express-validator` or `zod`) across all routes
- [ ] Pagination for expense list
- [ ] Receipt image upload (`Expense.receiptUrl` exists, upload UI/storage is not implemented)
- [ ] Automated tests

### Module 1 - Places + Bucket List Backend
- [x] `Trip.destination` field
- [x] `BucketListItem` model
- [x] `PlaceSearchCache` model with 30-day TTL
- [x] Ola Maps Places Text Search + Advance Place Details wrapper
- [x] Places search route: `GET /api/places/search?destination=Goa`
- [x] Bucket-list routes under `/api/trips/:id/bucket-list` and `/api/bucket-list/:itemId`
- [x] Server-side photo proxy route: `GET /api/places/photo?ref=<photo_reference>`

### Module 2 - Places + Bucket List Frontend
- [x] Destination field on CreateTrip and trip Overview
- [x] Suggested Attractions section on Places page
- [x] Add-to-bucket-list flow
- [x] Bucket List section with notes, visited toggle, and remove
- [x] Loading, empty, duplicate, and API-key-missing error states

### Module 3 - Gemini AI Itinerary Generation
- [x] `backend/services/geminiService.js`
- [x] `Trip.startDate`, `Trip.endDate`, and persisted `Trip.itinerary`
- [x] `GET /api/trips/:id/itinerary`
- [x] `POST /api/trips/:id/itinerary`
- [x] Gemini prompt uses trip name, destination, dates, budget, total spent, preferences, and bucket-list items
- [x] Simple per-user cooldown for itinerary generation
- [x] Frontend Generate/Regenerate Itinerary modal and saved itinerary display

### Module 4 - Collaboration + Analytics
- [x] `backend/models/ChatMessage.js`
- [x] `GET /api/trips/:id/chat`
- [x] `POST /api/trips/:id/chat`
- [x] Trip chat messages are protected by trip membership
- [x] Deleting a trip now also removes bucket-list items and chat messages
- [x] Frontend Trip Chat page with message history, send box, and polling refresh
- [x] Global Analytics page with trip search, trip dropdown, KPI cards, budget progress, category donut, daily trend, category rows, and all-trip spend-vs-budget chart
- [x] Settings page for profile summary, theme, notifications, compact preference, API key info, and security notes

## 2. Environment Variables

Use `backend/.env.example` as the template. Never commit the real `backend/.env`.

| Variable | Required | Notes |
|---|---|---|
| `PORT` | Yes | Defaults to `5000` |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Use a long random secret |
| `JWT_EXPIRES_IN` | Yes | Defaults to `7d` |
| `CLIENT_ORIGIN` | Yes | Frontend URL for CORS |
| `OLA_MAPS_API_KEY` | Yes for Places | Used server-side for Text Search, Advance Place Details, and photo media |
| `GEMINI_API_KEY` | Yes for AI | Used server-side for itinerary generation |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.0-flash` |

## 3. Known Limitations / Gotchas

- No password reset or email verification.
- Frontend API base URL is hardcoded in `frontend/src/api/axiosInstance.js`.
- "Join Trip" is add-by-email only.
- Settlement recalculates on every request.
- Places search is cached by lowercase/trimmed destination string.
- Ola Maps calls may cost money/quota for uncached destination searches (1 text search + up to 8 place-details calls per new destination).
- Gemini calls may cost money; the app has a simple in-memory cooldown, not production-grade rate limiting.
- Photo proxy is unauthenticated because browser image tags cannot attach the JWT header; it still keeps the Ola Maps API key server-side.
- No automated tests yet.

## 4. Suggested Next Work

1. Add backend/frontend automated tests.
2. Add route validation with `zod` or `express-validator`.
3. Make `VITE_API_BASE_URL` configurable before deployment.
4. Add receipt upload if needed for the next module.
5. Consider code-splitting Recharts pages if bundle size matters.
