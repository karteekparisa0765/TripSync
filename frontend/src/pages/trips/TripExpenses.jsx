import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BedDouble,
  Car,
  Fuel,
  Plus,
  Search,
  ShoppingBag,
  Ticket,
  Utensils,
  WalletCards,
} from 'lucide-react';
import Modal from '../../components/Modal';
import { Card, EmptyState, PageHeader, PrimaryButton, SecondaryButton } from '../../components/ui';
import { DEFAULT_CATEGORY, EXPENSE_CATEGORIES } from '../../constants/categories';
import { emptyExpenseForm } from '../../hooks/useTripWorkspace';
import { formatShortDate, money, toDateInput } from '../../utils/format';
import { getEntityId } from '../../utils/ids';

const categoryIcons = {
  Food: Utensils,
  Travel: Car,
  Stay: BedDouble,
  Fuel,
  Shopping: ShoppingBag,
  Entertainment: Ticket,
  Other: WalletCards,
};

const TripExpenses = () => {
  const workspace = useOutletContext();
  const { trip, expenses } = workspace;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    ...emptyExpenseForm,
    paidBy: getEntityId(trip.members[0]),
    splitAmong: trip.members.map(getEntityId).filter(Boolean),
  });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredExpenses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...expenses]
      .filter((expense) => !normalized || expense.description.toLowerCase().includes(normalized))
      .filter((expense) => !category || expense.category === category)
      .filter((expense) => !date || toDateInput(expense.date) === date)
      .sort((a, b) => {
        if (sort === 'amount-desc') return b.amount - a.amount;
        if (sort === 'amount-asc') return a.amount - b.amount;
        if (sort === 'date-asc') return new Date(a.date) - new Date(b.date);
        return new Date(b.date) - new Date(a.date);
      });
  }, [category, date, expenses, query, sort]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyExpenseForm,
      paidBy: getEntityId(trip.members[0]),
      splitAmong: trip.members.map(getEntityId).filter(Boolean),
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      paidBy: getEntityId(expense.paidBy),
      splitAmong: expense.splitAmong.map(getEntityId).filter(Boolean),
      date: toDateInput(expense.date),
      category: expense.category || DEFAULT_CATEGORY,
    });
    setError('');
    setModalOpen(true);
  };

  const toggleSplit = (memberId) => {
    setForm((prev) => ({
      ...prev,
      splitAmong: prev.splitAmong.includes(memberId)
        ? prev.splitAmong.filter((id) => id !== memberId)
        : [...prev.splitAmong, memberId],
    }));
  };

  const saveExpense = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.description.trim() || !form.amount || !form.paidBy) {
      setError('Description, amount, and paid by are required');
      return;
    }
    if (Number(form.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!form.splitAmong.length) {
      setError('Select at least one member to split among');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        paidBy: getEntityId(form.paidBy),
        splitAmong: form.splitAmong.map(getEntityId).filter(Boolean),
        amount: Number(form.amount),
      };
      if (editingId) await workspace.actions.updateExpense(editingId, payload);
      else await workspace.actions.addExpense(payload);
      setModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await workspace.actions.deleteExpense(expenseId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Expenses"
        description="Search, filter, sort, and manage every trip expense."
        actions={<PrimaryButton onClick={openAdd}><Plus className="h-4 w-4" /> Add Expense</PrimaryButton>}
      />

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="relative md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search expenses" className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800" />
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Amount high to low</option>
            <option value="amount-asc">Amount low to high</option>
          </select>
        </div>
      </Card>

      {filteredExpenses.length === 0 ? (
        <EmptyState icon={WalletCards} title="No expenses match" description="Add an expense or adjust the filters to see results." action={<PrimaryButton onClick={openAdd}>Add Expense</PrimaryButton>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredExpenses.map((expense) => {
            const Icon = categoryIcons[expense.category] || WalletCards;
            return (
              <Card key={expense.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-950 dark:text-gray-50">{expense.description}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Paid by {expense.paidBy.name || 'Unknown'} | {formatShortDate(expense.date)}
                      </p>
                      <p className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">{expense.category}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-950 dark:text-gray-50">{money(expense.amount)}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => openEdit(expense)}>Edit</SecondaryButton>
                  <SecondaryButton onClick={() => deleteExpense(expense.id)} className="border-red-200 text-red-600 dark:border-red-900 dark:text-red-300">Delete</SecondaryButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} title={editingId ? 'Edit Expense' : 'Add Expense'} onClose={() => setModalOpen(false)}>
        <form onSubmit={saveExpense} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Record one shared cost. Choose who paid first, then select everyone who should share the cost.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">What was paid for?</span>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Dinner, hotel booking, taxi..." className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Total amount</span>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="1000" className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Enter the full bill amount before splitting.</span>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Paid by</span>
              <select value={form.paidBy} onChange={(e) => setForm((p) => ({ ...p, paidBy: e.target.value }))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                <option value="">Select who paid</option>
                {trip.members.map((member) => {
                  const memberId = getEntityId(member);
                  return <option key={memberId} value={memberId}>{member.name}</option>;
                })}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Expense date</span>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Category</span>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
                {EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Split between</p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Select the members who should share this expense.
            </p>
            <div className="flex flex-wrap gap-2">
              {trip.members.map((member) => {
                const memberId = getEntityId(member);
                return (
                  <label key={memberId} className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                    <input type="checkbox" checked={form.splitAmong.includes(memberId)} onChange={() => toggleSplit(memberId)} />
                    {member.name}
                  </label>
                );
              })}
            </div>
          </div>
          <PrimaryButton disabled={saving}>{saving ? 'Saving...' : 'Save Expense'}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
};

export default TripExpenses;
