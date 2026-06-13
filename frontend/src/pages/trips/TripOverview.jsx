import React, { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CalendarDays, MapPinned, Plus, ReceiptText, Route, Users } from 'lucide-react';
import ActivityFeed from '../../components/ActivityFeed';
import BudgetWidget from '../../components/BudgetWidget';
import Modal from '../../components/Modal';
import { Card, PageHeader, PrimaryButton, SecondaryButton } from '../../components/ui';
import { formatDateRange, money } from '../../utils/format';
import { getTripCover } from '../../utils/tripImages';

const StatCard = ({ icon: Icon, label, value }) => (
  <Card className="p-5">
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-lg font-semibold text-gray-950 dark:text-gray-50">{value}</p>
      </div>
    </div>
  </Card>
);

const TripOverview = () => {
  const workspace = useOutletContext();
  const { trip, budget, activity } = workspace;
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(workspace.tripForm);
  const [error, setError] = useState('');

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await workspace.actions.saveTrip(form);
      setEditOpen(false);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="The calm command center for this trip."
        actions={<SecondaryButton onClick={() => setEditOpen(true)}>Edit Trip</SecondaryButton>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden">
          <img src={getTripCover(trip)} alt="" className="h-64 w-full object-cover" />
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={MapPinned} label="Destination" value={trip.destination || 'Not set'} />
            <StatCard icon={CalendarDays} label="Dates" value={formatDateRange(trip.startDate, trip.endDate)} />
            <StatCard icon={ReceiptText} label="Amount Spent" value={money(budget.spent)} />
            <StatCard icon={Users} label="Members" value={trip.members.length} />
          </div>
        </Card>

        <div className="space-y-6">
          <BudgetWidget budget={budget} />
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Link to="expenses"><PrimaryButton className="w-full"><Plus className="h-4 w-4" /> Add Expense</PrimaryButton></Link>
              <Link to="members"><SecondaryButton className="w-full"><Users className="h-4 w-4" /> Invite Member</SecondaryButton></Link>
              <Link to="settlements"><SecondaryButton className="w-full"><ReceiptText className="h-4 w-4" /> View Settlement</SecondaryButton></Link>
              <Link to="itinerary"><SecondaryButton className="w-full"><Route className="h-4 w-4" /> Add Place</SecondaryButton></Link>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Bucket list snapshot</h2>
            {workspace.bucketList.length > 0 ? (
              <div className="mt-4 space-y-3">
                {workspace.bucketList.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.address || 'No address available'}</p>
                  </div>
                ))}
                {workspace.bucketList.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">And {workspace.bucketList.length - 3} more saved place(s). Go to Bucket List to manage them.</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No bucket-list places yet. Use the Itinerary → Bucket List tab to add places and make your itinerary smarter.</p>
            )}
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-semibold text-gray-950 dark:text-gray-50">Recent Activity</h2>
        <ActivityFeed items={activity} />
      </Card>

      <Modal open={editOpen} title="Edit Trip" onClose={() => setEditOpen(false)}>
        <form onSubmit={save} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Trip name" />
            <input className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" value={form.destination} onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))} placeholder="Destination" />
            <input type="number" min="0" step="0.01" className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} placeholder="Budget" />
            <input type="date" className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
            <input type="date" className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
          <PrimaryButton disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
};

export default TripOverview;
