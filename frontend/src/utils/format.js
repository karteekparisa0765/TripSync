export const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const formatShortDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return 'Dates not set';
  if (startDate && !endDate) return `From ${formatShortDate(startDate)}`;
  if (!startDate && endDate) return `Until ${formatShortDate(endDate)}`;
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
};

export const getBudgetNumbers = (trip, totalSpent = 0) => {
  const budget = Number(trip?.budget || 0);
  const spent = Number(totalSpent || 0);
  const remaining = Math.max(0, budget - spent);
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  return { budget, spent, remaining, percent };
};
