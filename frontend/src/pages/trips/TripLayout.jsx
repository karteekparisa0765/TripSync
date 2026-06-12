import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  MessageCircle,
  Compass,
  CreditCard,
  MapPinned,
  PiggyBank,
  ReceiptText,
  Route,
  Users,
} from 'lucide-react';
import { ErrorMessage, Spinner, SuccessMessage } from '../../components/Feedback';
import { Card } from '../../components/ui';
import useTripWorkspace from '../../hooks/useTripWorkspace';
import { formatDateRange } from '../../utils/format';
import { getTripCover } from '../../utils/tripImages';

const tripNav = [
  { to: '.', end: true, label: 'Overview', icon: Compass },
  { to: 'expenses', label: 'Expenses', icon: ReceiptText },
  { to: 'settlements', label: 'Settlements', icon: CreditCard },
  { to: 'itinerary', label: 'Itinerary', icon: Route },
  { to: 'places', label: 'Places', icon: MapPinned },
  { to: 'members', label: 'Members', icon: Users },
  { to: 'chat', label: 'Chat', icon: MessageCircle },
  { to: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const TripLayout = () => {
  const workspace = useTripWorkspace();
  const { trip, loading, error, notice } = workspace;

  if (loading) {
    return (
      <div className="space-y-6">
        <Spinner label="Loading trip workspace..." />
      </div>
    );
  }

  if (error && !trip) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="relative min-h-56">
          <img src={getTripCover(trip)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-gray-950/40 to-transparent" />
          <div className="relative flex min-h-56 flex-col justify-end p-6 sm:p-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-md bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <PiggyBank className="h-3.5 w-3.5" />
              {workspace.budget.budget > 0 ? `${workspace.budget.percent}% budget used` : 'Budget not set'}
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{trip.name}</h1>
            <p className="mt-2 text-sm text-gray-200">
              {trip.destination || 'No destination set'} | {formatDateRange(trip.startDate, trip.endDate)}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <nav className="flex min-w-max gap-2">
            {tripNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </Card>

      {error && <ErrorMessage message={error} />}
      {notice && <SuccessMessage message={notice} />}

      <Outlet context={workspace} />
    </div>
  );
};

export default TripLayout;
