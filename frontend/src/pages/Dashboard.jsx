import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  IndianRupee,
  Plus,
  Plane,
} from 'lucide-react';
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
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { ErrorMessage, Spinner } from '../components/Feedback';
import { Card, EmptyState, PageHeader, PrimaryButton, SecondaryButton } from '../components/ui';
import { formatDateRange, getBudgetNumbers, money } from '../utils/format';
import { getTripCover } from '../utils/tripImages';

const COLORS = ['#4f46e5', '#059669', '#f59e0b', '#dc2626', '#0891b2', '#7c3aed', '#64748b'];

const StatCard = ({ icon: Icon, label, value, accent = 'text-gray-950 dark:text-gray-50' }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [tripAnalytics, setTripAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [dashboardRes, tripsRes] = await Promise.all([
          axiosInstance.get('/dashboard'),
          axiosInstance.get('/trips'),
        ]);
        setStats(dashboardRes.data);
        const loadedTrips = tripsRes.data.trips || [];
        setTrips(loadedTrips);
        setSelectedTripId((current) => current || loadedTrips[0]?.id || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!selectedTripId) {
      setTripAnalytics(null);
      return;
    }

    const fetchTripAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError('');
      try {
        const { data } = await axiosInstance.get(`/trips/${selectedTripId}/stats`);
        setTripAnalytics(data);
      } catch (err) {
        setAnalyticsError(err.response?.data?.message || 'Failed to load trip analytics');
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchTripAnalytics();
  }, [selectedTripId]);

  const recentTrips = trips.slice(0, 3);
  const selectedTrip = useMemo(
    () => trips.find((trip) => String(trip.id) === String(selectedTripId)),
    [selectedTripId, trips]
  );
  const selectedBudget = getBudgetNumbers(selectedTrip, tripAnalytics?.totalSpent || 0);
  const upcomingTrips = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trips
      .filter((trip) => trip.startDate && trip.startDate.slice(0, 10) >= today)
      .slice(0, 3);
  }, [trips]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user?.name || 'there'}`}
        description="A clear view of your trips, balances, and recent planning activity."
        actions={<Link to="/trips/new"><PrimaryButton><Plus className="h-4 w-4" /> Create Trip</PrimaryButton></Link>}
      />

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <Spinner label="Loading dashboard..." />
      ) : (
        stats && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Plane} label="Total Trips" value={stats.totalTrips} />
              <StatCard icon={IndianRupee} label="Total Expenses" value={money(stats.totalExpenses)} />
              <StatCard icon={ArrowUpRight} label="Amount Owed" value={money(stats.amountOwed)} accent="text-red-600 dark:text-red-300" />
              <StatCard icon={ArrowDownLeft} label="Amount Receivable" value={money(stats.amountToReceive)} accent="text-emerald-600 dark:text-emerald-300" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.55fr]">
              <Card className="p-6">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Trip Analytics</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Choose a trip to inspect budget usage, categories, and daily spend.
                    </p>
                  </div>
                  <select
                    value={selectedTripId}
                    onChange={(event) => setSelectedTripId(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 lg:w-64"
                  >
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!trips.length ? (
                  <EmptyState icon={BarChart3} title="No trips yet" description="Create a trip to see analytics here." />
                ) : analyticsLoading ? (
                  <Spinner label="Loading trip analytics..." />
                ) : analyticsError ? (
                  <ErrorMessage message={analyticsError} />
                ) : selectedTrip && tripAnalytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
                        <p className="mt-1 text-xl font-bold text-gray-950 dark:text-gray-50">
                          {selectedBudget.budget > 0 ? money(selectedBudget.budget) : 'Not set'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Spent</p>
                        <p className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-300">{money(selectedBudget.spent)}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                        <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-300">{money(selectedBudget.remaining)}</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{selectedTrip.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{selectedBudget.percent}% used</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${selectedBudget.percent}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                        <h3 className="mb-4 text-sm font-semibold text-gray-950 dark:text-gray-50">Category Breakdown</h3>
                        <div className="h-64">
                          {tripAnalytics.byCategory?.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={tripAnalytics.byCategory} dataKey="total" nameKey="category" innerRadius={52} outerRadius={88} paddingAngle={3}>
                                  {tripAnalytics.byCategory.map((entry, index) => (
                                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => money(value)} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <EmptyState icon={BarChart3} title="No categories yet" description="Add categorized expenses to see the split." />
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                        <h3 className="mb-4 text-sm font-semibold text-gray-950 dark:text-gray-50">Daily Spend Trend</h3>
                        <div className="h-64">
                          {tripAnalytics.byDate?.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={tripAnalytics.byDate}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value) => money(value)} />
                                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <EmptyState icon={BarChart3} title="No daily trend yet" description="Add expenses on different dates to see movement." />
                          )}
                        </div>
                      </div>
                    </div>

                    {tripAnalytics.byCategory?.length > 0 && (
                      <div className="space-y-3">
                        {tripAnalytics.byCategory.map((item, index) => {
                          const percent = tripAnalytics.totalSpent > 0 ? Math.round((item.total / tripAnalytics.totalSpent) * 100) : 0;
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
                    )}
                  </div>
                ) : (
                  <EmptyState icon={BarChart3} title="Select a trip" description="Choose a trip from the dropdown to see analytics." />
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Quick Actions</h2>
                <div className="mt-5 grid grid-cols-1 gap-3">
                  <Link to="/trips/new"><PrimaryButton className="w-full"><Plus className="h-4 w-4" /> New Trip</PrimaryButton></Link>
                  <Link to="/trips"><SecondaryButton className="w-full"><Plane className="h-4 w-4" /> Browse Trips</SecondaryButton></Link>
                  <Link to="/trips"><SecondaryButton className="w-full"><BarChart3 className="h-4 w-4" /> Review Budgets</SecondaryButton></Link>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Recent Trips</h2>
                  <Link to="/trips" className="text-sm font-medium text-indigo-600 dark:text-indigo-300">View all</Link>
                </div>
                {recentTrips.length ? (
                  <div className="space-y-4">
                    {recentTrips.map((trip) => (
                      <Link key={trip.id} to={`/trips/${trip.id}`} className="flex gap-4 rounded-lg border border-gray-200 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                        <img src={getTripCover(trip)} alt="" className="h-16 w-20 rounded-md object-cover" />
                        <div>
                          <p className="font-medium text-gray-950 dark:text-gray-50">{trip.name}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{trip.destination || 'Destination not set'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Plane} title="No trips yet" description="Create a trip to see it here." />
                )}
              </Card>

              <Card className="p-6">
                <h2 className="mb-5 text-lg font-semibold text-gray-950 dark:text-gray-50">Upcoming Trips</h2>
                {upcomingTrips.length ? (
                  <div className="space-y-3">
                    {upcomingTrips.map((trip) => (
                      <Link key={trip.id} to={`/trips/${trip.id}`} className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                        <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        <div>
                          <p className="font-medium text-gray-950 dark:text-gray-50">{trip.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDateRange(trip.startDate, trip.endDate)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={CalendarDays} title="No upcoming dates" description="Set trip dates to see upcoming plans." />
                )}
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
};

export default Dashboard;
