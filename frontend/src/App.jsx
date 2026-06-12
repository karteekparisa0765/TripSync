import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import TripList from './pages/TripList';
import CreateTrip from './pages/CreateTrip';
import TripLayout from './pages/trips/TripLayout';
import TripOverview from './pages/trips/TripOverview';
import TripExpenses from './pages/trips/TripExpenses';
import TripSettlements from './pages/trips/TripSettlements';
import TripItinerary from './pages/trips/TripItinerary';
import TripPlaces from './pages/trips/TripPlaces';
import TripMembers from './pages/trips/TripMembers';
import TripChat from './pages/trips/TripChat';
import TripAnalytics from './pages/trips/TripAnalytics';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/trips" element={<TripList />} />
            <Route path="/trips/new" element={<CreateTrip />} />
            <Route path="/trips/:id" element={<TripLayout />}>
              <Route index element={<TripOverview />} />
              <Route path="expenses" element={<TripExpenses />} />
              <Route path="settlements" element={<TripSettlements />} />
              <Route path="itinerary" element={<TripItinerary />} />
              <Route path="places" element={<TripPlaces />} />
              <Route path="members" element={<TripMembers />} />
              <Route path="chat" element={<TripChat />} />
              <Route path="analytics" element={<TripAnalytics />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
