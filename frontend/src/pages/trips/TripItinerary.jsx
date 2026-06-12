import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Route, Sparkles } from 'lucide-react';
import Modal from '../../components/Modal';
import { Card, EmptyState, PageHeader, PrimaryButton } from '../../components/ui';

const TripItinerary = () => {
  const { itinerary, actions } = useOutletContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await actions.generateItinerary(preferences);
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Itinerary"
        description="Generate and keep a day-by-day AI travel plan."
        actions={<PrimaryButton onClick={() => setModalOpen(true)}><Sparkles className="h-4 w-4" /> {itinerary?.content ? 'Regenerate' : 'Generate'}</PrimaryButton>}
      />

      {itinerary?.content ? (
        <Card className="p-6">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Generated {itinerary.generatedAt ? new Date(itinerary.generatedAt).toLocaleString('en-IN') : ''}
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-700 dark:text-gray-200">
            {itinerary.content}
          </pre>
        </Card>
      ) : (
        <EmptyState
          icon={Route}
          title="No itinerary yet"
          description="Generate a plan from your destination, dates, budget, expenses, and saved places."
          action={<PrimaryButton onClick={() => setModalOpen(true)}>Generate Itinerary</PrimaryButton>}
        />
      )}

      <Modal open={modalOpen} title="Generate Itinerary" onClose={() => setModalOpen(false)}>
        <form onSubmit={generate} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
          <textarea
            value={preferences}
            onChange={(event) => setPreferences(event.target.value)}
            rows="5"
            placeholder="Optional preferences: relaxed pace, food focus, avoid late nights..."
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <PrimaryButton disabled={loading}>{loading ? 'Generating...' : 'Generate Plan'}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
};

export default TripItinerary;
