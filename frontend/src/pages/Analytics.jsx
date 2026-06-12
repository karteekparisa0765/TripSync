import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, CalendarDays, Plane, Search, WalletCards } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { ErrorMessage, Spinner } from '../components/Feedback';
import { Card, EmptyState, PageHeader, PrimaryButton } from '../components/ui';
import { formatDateRange, getBudgetNumbers, money } from '../utils/format';

const COLORS = ['#4f46e5', '#059669', '#f59e0b', '#dc2626', '#0891b2', '#7c3aed', '#64748b'];

const Kpi = ({ label, value, sub }) => (
  <Card className="p-5">
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-2 text-2xl font-bold text-gray-950 dark:text-gray-50">{value}</p>
    {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
  </Card>
);

const Analytics = () => {
  const [dashboard, setDashboard] = useState(null);
  const [trips, setTrips] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [tripStats, setTripStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tripLoading, setTripLoading] = useState(false);
  const [error, setError] = useState('');
  const [tripError, setTripError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [dashboardRes, tripsRes] = await Promise.all([
          axiosInstance.get('/dashboard'),
          axiosInstance.get('/trips'),
        ]);
        const loadedTrips = tripsRes.data.trips || [];
        setDashboard(dashboardRes.data);
        setTrips(loadedTrips);
        setSelectedTripId(loadedTrips[0]?.id || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedTripId) {
      setTripStats(null);
      return;
    }

    const loadTrip = async () => {
      setTripLoading(true);
      setTripError('');
      try {
        const { data } = await axiosInstance.get(`/trips/${selectedTripId}/stats`);
        setTripStats(data);
      } catch (err) {
        setTripError(err.response?.data?.message || 'Failed to load trip analytics');
      } finally {
        setTripLoading(false);
      }
    };

    loadTrip();
  }, [selectedTripId]);

  const filteredTrips = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return trips;
    return trips.filter((trip) =>
      `${trip.name} ${trip.destination || ''}`.toLowerCase().includes(value)
    );
  }, [query, trips]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => String(trip.id) === String(selectedTripId)),
    [selectedTripId, trips]
  );
  const budget = getBudgetNumbers(selectedTrip, tripStats?.totalSpent || 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" description="PowerBI-style spending intelligence across your trips." />

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <Spinner label="Loading analytics..." />
      ) : !trips.length ? (
        <EmptyState
          icon={Plane}
          title="No trips to analyze"
          description="Create a trip and add expenses to unlock analytics."
          action={<Link to="/trips/new"><PrimaryButton>Create Trip</PrimaryButton></Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Total Trips" value={dashboard?.totalTrips || 0} />
            <Kpi label="Total Expenses" value={money(dashboard?.totalExpenses || 0)} />
            <Kpi label="You Owe" value={money(dashboard?.amountOwed || 0)} />
            <Kpi label="You Receive" value={money(dashboard?.amountToReceive || 0)} />
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search trips by name or destination"
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </label>
              <select
                value={selectedTripId}
                onChange={(event) => setSelectedTripId(event.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {filteredTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {tripLoading ? (
            <Spinner label="Loading selected trip..." />
          ) : tripError ? (
            <ErrorMessage message={tripError} />
          ) : selectedTrip && tripStats ? (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Selected Trip" value={selectedTrip.name} sub={selectedTrip.destination || 'No destination'} />
                <Kpi label="Trip Dates" value={formatDateRange(selectedTrip.startDate, selectedTrip.endDate)} />
                <Kpi label="Spent" value={money(budget.spent)} sub={`${budget.percent}% of budget used`} />
                <Kpi label="Remaining" value={money(budget.remaining)} sub={budget.budget > 0 ? `Budget ${money(budget.budget)}` : 'No budget set'} />
              </div>

              <Card className="p-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Budget progress</span>
                  <span className="text-gray-500 dark:text-gray-400">{budget.percent}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${budget.percent}%` }} />
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="p-6">
                  <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-950 dark:text-gray-50">
                    <WalletCards className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                    Category Split
                  </h2>
                  <div className="h-80">
                    {tripStats.byCategory?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={tripStats.byCategory} dataKey="total" nameKey="category" innerRadius={70} outerRadius={115} paddingAngle={3}>
                            {tripStats.byCategory.map((entry, index) => (
                              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => money(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState icon={WalletCards} title="No category data" description="Add categorized expenses to see this chart." />
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-950 dark:text-gray-50">
                    <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                    Daily Spend Trend
                  </h2>
                  <div className="h-80">
                    {tripStats.byDate?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tripStats.byDate}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => money(value)} />
                          <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState icon={CalendarDays} title="No daily data" description="Add expenses to see trends." />
                    )}
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <h2 className="mb-5 text-lg font-semibold text-gray-950 dark:text-gray-50">Category Details</h2>
                {tripStats.byCategory?.length ? (
                  <div className="space-y-4">
                    {tripStats.byCategory.map((item, index) => {
                      const percent = tripStats.totalSpent > 0 ? Math.round((item.total / tripStats.totalSpent) * 100) : 0;
                      return (
                        <div key={item.category}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{item.category}</span>
                            <span className="text-gray-500 dark:text-gray-400">{money(item.total)} | {percent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon={BarChart3} title="No categories yet" description="Category rows appear after you add expenses." />
                )}
              </Card>

              <Card className="p-6">
                <h2 className="mb-5 text-lg font-semibold text-gray-950 dark:text-gray-50">All Trips: Spent vs Budget</h2>
                <div className="h-80">
                  {dashboard?.tripBreakdown?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.tripBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => money(value)} />
                        <Bar dataKey="total" name="Spent" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="budget" name="Budget" fill="#059669" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={BarChart3} title="No comparison yet" description="Add expenses and budgets to compare trips." />
                  )}
                </div>
              </Card>
            </>
          ) : (
            <EmptyState icon={BarChart3} title="Select a trip" description="Choose a trip to view detailed analytics." />
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
