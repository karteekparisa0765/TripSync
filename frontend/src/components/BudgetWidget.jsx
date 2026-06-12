import React from 'react';
import { PiggyBank } from 'lucide-react';
import { Card } from './ui';
import { money } from '../utils/format';

const BudgetWidget = ({ budget }) => (
  <Card className="p-6">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Budget Tracking</p>
        <h3 className="mt-1 text-xl font-bold text-gray-950 dark:text-gray-50">
          {budget.budget > 0 ? money(budget.budget) : 'No budget set'}
        </h3>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        <PiggyBank className="h-6 w-6" />
      </div>
    </div>
    <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${budget.percent}%` }} />
    </div>
    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
      <div>
        <p className="text-gray-500 dark:text-gray-400">Spent</p>
        <p className="font-semibold text-gray-950 dark:text-gray-50">{money(budget.spent)}</p>
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400">Remaining</p>
        <p className="font-semibold text-emerald-600 dark:text-emerald-300">{money(budget.remaining)}</p>
      </div>
      <div>
        <p className="text-gray-500 dark:text-gray-400">Used</p>
        <p className="font-semibold text-gray-950 dark:text-gray-50">{budget.percent}%</p>
      </div>
    </div>
  </Card>
);

export default BudgetWidget;
