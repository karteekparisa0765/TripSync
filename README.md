# Trip Expense Splitter — MVP

A full-stack app for splitting trip expenses among friends and calculating who owes whom.

## Tech Stack

- **Frontend:** React (Vite, JavaScript) + Tailwind CSS + React Router
- **Backend:** Node.js + Express.js + MongoDB Atlas (Mongoose)
- **Auth:** JWT

## Project Structure

```
trip-splitter/
  backend/
    models/        User.js, Trip.js, Expense.js
    controllers/    authController.js, tripController.js, expenseController.js, dashboardController.js
    routes/        authRoutes.js, tripRoutes.js, expenseRoutes.js, dashboardRoutes.js
    middleware/     authMiddleware.js
    utils/          settlement.js (debt simplification algorithm)
    server.js
    .env.example
  frontend/
    src/
      context/      AuthContext.jsx
      pages/        Login, Register, Dashboard, TripList, CreateTrip, TripDetail
      components/   Navbar, ProtectedRoute, Feedback (Spinner/Error/Success)
      api/           axiosInstance.js
      App.jsx, main.jsx
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: add your MongoDB Atlas connection string and a JWT secret
npm run dev    # uses nodemon, or `npm start` for plain node
```

Backend runs on `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Overview

### Auth (`/api/auth`)
- `POST /register` — { name, email, password }
- `POST /login` — { email, password }
- `POST /logout` — (protected, stateless — client deletes token)
- `GET /me` — (protected) returns current user

### Trips (`/api/trips`) — all protected
- `POST /` — { name } → creates trip, creator added as member
- `GET /` — list trips for current user
- `GET /:id` — trip details (populated members)
- `POST /:id/members` — { email } → adds an existing registered user as member

### Expenses
- `POST /api/trips/:id/expenses` — { description, amount, paidBy, splitAmong[], date, category }
- `GET /api/trips/:id/expenses` — list expenses for a trip
- `PUT /api/expenses/:id` — edit expense
- `DELETE /api/expenses/:id` — delete expense
- `GET /api/trips/:id/settlement` — { balances, transactions } (greedy debt simplification)

### Dashboard (`/api/dashboard`) — protected
- `GET /` — { totalTrips, totalExpenses, amountOwed, amountToReceive }

## Notes

- "Join Trip" is implemented as "Add Member by email" (the trip creator/any member adds existing registered users). This avoids invite-token complexity for the MVP.
- Settlement uses a greedy algorithm: matches the largest creditor with the largest debtor repeatedly to minimize the number of transactions.
- Dark mode preference is stored in `localStorage` and toggled via the Navbar.
