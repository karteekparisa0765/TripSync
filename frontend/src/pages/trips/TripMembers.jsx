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
  const [removingId, setRemovingId] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const isCreator = trip.createdBy === user?.id;

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
    setActionError('');
    setRemovingId(memberId);
    try {
      await actions.removeMember(memberId);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingId('');
    }
  };

  const leaveTrip = async () => {
    if (!window.confirm('Leave this trip? You will lose access to it.')) return;
    setActionError('');
    try {
      await actions.leaveTrip();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to leave trip');
    }
  };

  const deleteTrip = async () => {
    if (!window.confirm('Delete this trip and all related expenses? This cannot be undone.')) return;
    setActionError('');
    try {
      await actions.deleteTrip();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete trip');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Members"
        description="Invite and manage the people sharing this trip."
        actions={
          <PrimaryButton onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite Member
          </PrimaryButton>
        }
      />

      {actionError && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {trip.members.map((member) => {
          const memberIsCreator = member.id === trip.createdBy;
          const memberIsCurrentUser = member.id === user?.id;
          // Show Remove button only when:
          //   - this member is not the current user (they have Leave Trip for themselves)
          //   - this member is not the trip creator (creator cannot be removed)
          const canRemove = !memberIsCurrentUser && !memberIsCreator;

          return (
            <Card key={member.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-950 dark:text-gray-50">
                        {member.name}
                        {memberIsCurrentUser && (
                          <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
                        )}
                      </h3>
                      {memberIsCreator && (
                        <Crown className="h-4 w-4 text-amber-500" title="Trip creator" />
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail className="h-4 w-4" />
                      {member.email}
                    </p>
                  </div>
                </div>

                {canRemove && (
                  <SecondaryButton
                    onClick={() => removeMember(member.id)}
                    disabled={removingId === member.id}
                    className="border-red-200 text-red-600 dark:border-red-900 dark:text-red-300"
                  >
                    {removingId === member.id ? 'Removing...' : 'Remove'}
                  </SecondaryButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">Trip Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {!isCreator && (
            <SecondaryButton onClick={leaveTrip}>Leave Trip</SecondaryButton>
          )}
          {isCreator && (
            <DangerButton onClick={deleteTrip}>Delete Trip</DangerButton>
          )}
        </div>
      </Card>

      <Modal open={modalOpen} title="Invite Member" onClose={() => setModalOpen(false)}>
        <form onSubmit={addMember} className="space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="friend@example.com"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <PrimaryButton disabled={loading}>
            {loading ? 'Inviting...' : 'Invite'}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
};

export default TripMembers;
