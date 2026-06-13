import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { DEFAULT_CATEGORY } from '../constants/categories';
import { getBudgetNumbers, toDateInput } from '../utils/format';

export const emptyExpenseForm = {
  description: '',
  amount: '',
  paidBy: '',
  splitAmong: [],
  date: new Date().toISOString().slice(0, 10),
  category: DEFAULT_CATEGORY,
};

const emptyTripForm = {
  name: '',
  destination: '',
  budget: '',
  startDate: '',
  endDate: '',
};

const useTripWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [stats, setStats] = useState(null);
  const [bucketList, setBucketList] = useState([]);
  const [itinerary, setItinerary] = useState(null);
  const [tripForm, setTripForm] = useState(emptyTripForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tripRes, expensesRes, settlementRes, statsRes, bucketRes, itineraryRes] =
        await Promise.all([
          axiosInstance.get(`/trips/${id}`),
          axiosInstance.get(`/trips/${id}/expenses`),
          axiosInstance.get(`/trips/${id}/settlement`),
          axiosInstance.get(`/trips/${id}/stats`),
          axiosInstance.get(`/trips/${id}/bucket-list`),
          axiosInstance.get(`/trips/${id}/itinerary`),
        ]);

      const loadedTrip = tripRes.data.trip;
      setTrip(loadedTrip);
      setTripForm({
        name: loadedTrip.name || '',
        destination: loadedTrip.destination || '',
        budget: loadedTrip.budget ?? '',
        startDate: toDateInput(loadedTrip.startDate),
        endDate: toDateInput(loadedTrip.endDate),
      });
      setExpenses(expensesRes.data.expenses);
      setSettlement(settlementRes.data);
      setStats(statsRes.data);
      setBucketList(bucketRes.data.items);
      setItinerary(itineraryRes.data.itinerary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load trip details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refreshMoneyData = useCallback(async () => {
    const [expensesRes, settlementRes, statsRes] = await Promise.all([
      axiosInstance.get(`/trips/${id}/expenses`),
      axiosInstance.get(`/trips/${id}/settlement`),
      axiosInstance.get(`/trips/${id}/stats`),
    ]);
    setExpenses(expensesRes.data.expenses);
    setSettlement(settlementRes.data);
    setStats(statsRes.data);
  }, [id]);

  const refreshBucketList = useCallback(async () => {
    const { data } = await axiosInstance.get(`/trips/${id}/bucket-list`);
    setBucketList(data.items);
    return data.items;
  }, [id]);

  const saveTrip = async (payload = tripForm) => {
    if (!payload.name.trim()) throw new Error('Trip name is required');
    if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
      throw new Error('Start date cannot be after end date');
    }
    const { data } = await axiosInstance.put(`/trips/${id}`, payload);
    setTrip(data.trip);
    setTripForm({
      name: data.trip.name || '',
      destination: data.trip.destination || '',
      budget: data.trip.budget ?? '',
      startDate: toDateInput(data.trip.startDate),
      endDate: toDateInput(data.trip.endDate),
    });
    setNotice('Trip updated');
    return data.trip;
  };

  const addExpense = async (payload) => {
    await axiosInstance.post(`/trips/${id}/expenses`, payload);
    await refreshMoneyData();
    setNotice('Expense added');
  };

  const updateExpense = async (expenseId, payload) => {
    await axiosInstance.put(`/expenses/${expenseId}`, payload);
    await refreshMoneyData();
    setNotice('Expense updated');
  };

  const deleteExpense = async (expenseId) => {
    await axiosInstance.delete(`/expenses/${expenseId}`);
    await refreshMoneyData();
    setNotice('Expense deleted');
  };

  const addMember = async (email) => {
    const { data } = await axiosInstance.post(`/trips/${id}/members`, { email });
    setTrip(data.trip);
    setNotice('Member added');
  };

  const removeMember = async (memberId) => {
    const { data } = await axiosInstance.delete(`/trips/${id}/members/${memberId}`);
    setTrip(data.trip);
    setNotice('Member removed');
  };

  const leaveTrip = async () => {
    await axiosInstance.post(`/trips/${id}/leave`);
    navigate('/trips');
  };

  const deleteTrip = async () => {
    await axiosInstance.delete(`/trips/${id}`);
    navigate('/trips');
  };

  const addBucketItem = async (place) => {
    const { data } = await axiosInstance.post(`/trips/${id}/bucket-list`, place);
    setBucketList((items) => [data.item, ...items]);
    setNotice('Place added');
  };

  const updateBucketItem = async (itemId, patch) => {
    const { data } = await axiosInstance.put(`/bucket-list/${itemId}`, patch);
    setBucketList((items) => items.map((item) => (item.id === itemId ? data.item : item)));
  };

  const removeBucketItem = async (itemId) => {
    await axiosInstance.delete(`/bucket-list/${itemId}`);
    setBucketList((items) => items.filter((item) => item.id !== itemId));
    setNotice('Place removed');
  };

  const generateItinerary = async (preferences) => {
    await refreshBucketList();
    const { data } = await axiosInstance.post(`/trips/${id}/itinerary`, { preferences });
    setItinerary(data.itinerary);
    setNotice('Itinerary generated');
  };

  const askAssistant = async (question) => {
    const { data } = await axiosInstance.post(`/trips/${id}/assistant`, { question });
    return data.answer;
  };

  const activity = useMemo(() => {
    const expenseItems = expenses.slice(0, 5).map((expense) => ({
      id: `expense-${expense.id}`,
      date: expense.createdAt || expense.date,
      title: `${expense.paidBy?.name || 'Someone'} added ${expense.description}`,
      meta: `${expense.category} expense`,
    }));
    const placeItems = bucketList.slice(0, 4).map((item) => ({
      id: `place-${item.id}`,
      date: item.createdAt,
      title: `${item.name} was added to places`,
      meta: item.visited ? 'Visited' : 'Bucket list',
    }));
    const itineraryItem = itinerary?.generatedAt
      ? [
          {
            id: 'itinerary-generated',
            date: itinerary.generatedAt,
            title: 'AI itinerary was generated',
            meta: 'Planning',
          },
        ]
      : [];

    return [...expenseItems, ...placeItems, ...itineraryItem]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [bucketList, expenses, itinerary]);

  return {
    id,
    trip,
    setTrip,
    expenses,
    settlement,
    stats,
    bucketList,
    itinerary,
    tripForm,
    setTripForm,
    loading,
    error,
    setError,
    notice,
    setNotice,
    budget: getBudgetNumbers(trip, stats?.totalSpent || 0),
    activity,
    refreshAll: fetchAll,
    refreshMoneyData,
    actions: {
      saveTrip,
      addExpense,
      updateExpense,
      deleteExpense,
      addMember,
      removeMember,
      leaveTrip,
      deleteTrip,
      addBucketItem,
      updateBucketItem,
      removeBucketItem,
      generateItinerary,
      askAssistant,
    },
  };
};

export default useTripWorkspace;
