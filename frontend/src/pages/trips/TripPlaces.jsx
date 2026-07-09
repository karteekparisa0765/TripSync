import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapPinned, Plus, Search } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import Modal from '../../components/Modal';
import { Card, EmptyState, PageHeader, PrimaryButton, SecondaryButton } from '../../components/ui';

const apiOrigin = axiosInstance.defaults.baseURL.replace(/\/api\/?$/, '');
const photoSrc = (url) => (url?.startsWith('/api') ? `${apiOrigin}${url}` : url);

// Renders a place photo via our backend proxy, falling back to a placeholder
// block (instead of a broken-image icon) if the photo fails to load — e.g.
// the place has no photo, or the Ola Maps photo request failed.
const PlacePhoto = ({ src, alt, className }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className || ''}`}>
        <MapPinned className="h-6 w-6 text-gray-400 dark:text-gray-600" />
      </div>
    );
  }

  return <img src={photoSrc(src)} alt={alt} className={className} onError={() => setFailed(true)} />;
};

const TripPlaces = () => {
  const workspace = useOutletContext();
  const { trip, bucketList, tripForm, actions } = workspace;
  const [modalOpen, setModalOpen] = useState(false);
  const [destination, setDestination] = useState(tripForm.destination || trip.destination || '');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingPlaceId, setAddingPlaceId] = useState('');
  const [error, setError] = useState('');

  const bucketPlaceIds = useMemo(() => new Set(bucketList.map((item) => item.placeId)), [bucketList]);

  const searchPlaces = async (event) => {
    event.preventDefault();
    setError('');
    setPlaces([]);

    if (!destination.trim()) {
      setError('Add a destination before searching attractions');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/places/search', { params: { destination } });
      setPlaces(data.results || []);
      if ((data.results || []).length === 0) setError('No suggested attractions found');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search places');
    } finally {
      setLoading(false);
    }
  };

  const addPlace = async (place) => {
    setAddingPlaceId(place.placeId);
    setError('');
    try {
      await actions.addBucketItem(place);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add place');
    } finally {
      setAddingPlaceId('');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Places"
        description="Search attractions and build a clean bucket list."
        actions={<PrimaryButton onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Add Place</PrimaryButton>}
      />

      {bucketList.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No saved places yet"
          description="Search attractions and save the places your group wants to visit."
          action={<PrimaryButton onClick={() => setModalOpen(true)}>Search Places</PrimaryButton>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {bucketList.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <PlacePhoto src={item.photoUrl} alt={item.name} className="h-44 w-full object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-950 dark:text-gray-50">{item.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.address}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.visited}
                      onChange={(event) => actions.updateBucketItem(item.id, { visited: event.target.checked })}
                    />
                    Visited
                  </label>
                </div>
                <textarea
                  value={item.notes || ''}
                  onChange={(event) => actions.updateBucketItem(item.id, { notes: event.target.value })}
                  rows="2"
                  placeholder="Notes"
                  className="mt-4 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
                <SecondaryButton onClick={() => actions.removeBucketItem(item.id)} className="mt-3 border-red-200 text-red-600 dark:border-red-900 dark:text-red-300">
                  Remove
                </SecondaryButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Search Attractions" onClose={() => setModalOpen(false)}>
        <form onSubmit={searchPlaces} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Destination" className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <PrimaryButton disabled={loading}><Search className="h-4 w-4" /> {loading ? 'Searching...' : 'Search'}</PrimaryButton>
          </div>
        </form>
        <div className="mt-5 grid max-h-[55vh] grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
          {places.map((place) => (
            <div key={place.placeId} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
              <PlacePhoto src={place.photoUrl} alt={place.name} className="h-32 w-full object-cover" />
              <div className="p-3">
                <h3 className="font-medium text-gray-950 dark:text-gray-50">{place.name}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{place.address}</p>
                <PrimaryButton className="mt-3 w-full" disabled={bucketPlaceIds.has(place.placeId) || addingPlaceId === place.placeId} onClick={() => addPlace(place)}>
                  {bucketPlaceIds.has(place.placeId) ? 'Saved' : addingPlaceId === place.placeId ? 'Adding...' : 'Add'}
                </PrimaryButton>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default TripPlaces;
