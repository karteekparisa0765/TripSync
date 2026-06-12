import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Crown, Mail, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { Card, DangerButton, PageHeader, PrimaryButton, SecondaryButton } from '../../components/ui';

const TripMembers = () => {
  const { user } = useAuth();
  const { trip, actions } = useOutletContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addMember = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      await actions.addMember(email);
      setEmail('');
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member from the trip?')) return;
    await actions.removeMember(memberId);
  };

  const leaveTrip = async () => {
    if (!window.confirm('Leave this trip?')) return;
    await actions.leaveTrip();
  };

  const deleteTrip = async () => {
    if (!window.confirm('Delete this trip and all related expenses?')) return;
    await actions.deleteTrip();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Members"
        description="Invite and manage the people sharing this trip."
        actions={<PrimaryButton onClick={() => setModalOpen(true)}><UserPlus className="h-4 w-4" /> Invite Member</PrimaryButton>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {trip.members.map((member) => (
          <Card key={member.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-950 dark:text-gray-50">{member.name}</h3>
                    {member.id === trip.createdBy && <Crown className="h-4 w-4 text-amber-500" />}
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </p>
                </div>
              </div>
              {member.id !== user?.id && member.id !== trip.createdBy && (
                <SecondaryButton onClick={() => removeMember(member.id)} className="border-red-200 text-red-600 dark:border-red-900 dark:text-red-300">
                  Remove
                </SecondaryButton>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Trip Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <SecondaryButton onClick={leaveTrip}>Leave Trip</SecondaryButton>
          {trip.createdBy === user?.id && <DangerButton onClick={deleteTrip}>Delete Trip</DangerButton>}
        </div>
      </Card>

      <Modal open={modalOpen} title="Invite Member" onClose={() => setModalOpen(false)}>
        <form onSubmit={addMember} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@example.com"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <PrimaryButton disabled={loading}>{loading ? 'Inviting...' : 'Invite'}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
};

export default TripMembers;
