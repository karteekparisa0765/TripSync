import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CreditCard } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '../../components/ui';
import { money } from '../../utils/format';

const TripSettlements = () => {
  const { settlement } = useOutletContext();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settlements"
        description="A Splitwise-style view of who should pay whom."
      />

      {settlement?.transactions?.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Everyone is settled up"
          description="No payments are needed for this trip right now."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {settlement.transactions.map((tx, index) => (
            <Card key={`${tx.from.userId}-${tx.to.userId}-${index}`} className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
                  <p className="mt-1 font-semibold text-gray-950 dark:text-gray-50">{tx.from.name}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">To</p>
                  <p className="mt-1 font-semibold text-gray-950 dark:text-gray-50">{tx.to.name}</p>
                </div>
              </div>
              <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                <p className="mt-1 text-2xl font-bold text-gray-950 dark:text-gray-50">{money(tx.amount)}</p>
                <p className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-200">
                  Pending
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-950 dark:text-gray-50">Balances</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {settlement?.balances?.map((balance) => (
            <div key={balance.userId} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-950 dark:text-gray-50">{balance.name}</p>
                  <p
                    className={
                      balance.balance > 0
                        ? 'text-sm font-semibold text-emerald-600 dark:text-emerald-300'
                        : balance.balance < 0
                          ? 'text-sm font-semibold text-red-600 dark:text-red-300'
                          : 'text-sm font-semibold text-gray-500 dark:text-gray-400'
                    }
                  >
                    {balance.balance > 0
                      ? `Receives ${money(balance.balance)}`
                      : balance.balance < 0
                        ? `Pays ${money(Math.abs(balance.balance))}`
                        : 'Settled'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TripSettlements;
