import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPinned, Plus, Users } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { ErrorMessage, Spinner } from '../components/Feedback';
import { Card, EmptyState, PageHeader, PrimaryButton } from '../components/ui';
import { formatDateRange, getBudgetNumbers, money } from '../utils/format';
import { getTripCover } from '../utils/tripImages';

const TripCard = ({ trip, breakdown }) => {
  const budget = getBudgetNumbers(trip, breakdown?.total || 0);

  return (
    <Card className="group overflow-hidden">
      <div className="relative h-44">
        <img src={getTripCover(trip)} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/70 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-xl font-bold text-white">{trip.name}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-200">
            <MapPinned className="h-4 w-4" />
            {trip.destination || 'Destination not set'}
          </p>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 dark:text-gray-300">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            {formatDateRange(trip.startDate, trip.endDate)}
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Budget</span>
            <span className="font-medium text-gray-950 dark:text-gray-50">
              {budget.budget > 0 ? `${budget.percent}% used` : 'Not set'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${budget.percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {budget.budget > 0 ? `${money(budget.spent)} spent of ${money(budget.budget)}` : 'Add a budget from the trip overview'}
          </p>
        </div>

        <Link
          to={`/trips/${trip.id}`}
          className="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Open Trip
        </Link>
      </div>
    </Card>
  );
};

const TripList = () => {
  const [trips, setTrips] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      setError('');
      try {
        const [tripsRes, dashboardRes] = await Promise.all([
          axiosInstance.get('/trips'),
          axiosInstance.get('/dashboard'),
        ]);
        setTrips(tripsRes.data.trips);
        setBreakdown(dashboardRes.data.tripBreakdown || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load trips');
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const breakdownByTrip = useMemo(
    () => new Map(breakdown.map((item) => [String(item.tripId), item])),
    [breakdown]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trips"
        description="Plan destinations, split costs, and keep your group aligned."
        actions={<Link to="/trips/new"><PrimaryButton><Plus className="h-4 w-4" /> Create Trip</PrimaryButton></Link>}
      />

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <Spinner label="Loading trips..." />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No trips yet"
          description="Create your first trip and start adding members, expenses, places, and an itinerary."
          action={<Link to="/trips/new"><PrimaryButton>Create Trip</PrimaryButton></Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} breakdown={breakdownByTrip.get(String(trip.id))} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TripList;
