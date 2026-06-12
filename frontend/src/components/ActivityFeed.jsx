import React from 'react';
import { Clock3 } from 'lucide-react';
import { EmptyState } from './ui';
import { formatShortDate } from '../utils/format';

const ActivityFeed = ({ items }) => {
  if (!items.length) {
    return (
      <EmptyState
        icon={Clock3}
        title="No activity yet"
        description="Activity appears here as expenses, places, members, and itineraries are added."
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="relative flex gap-4">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <Clock3 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-950 dark:text-gray-50">{item.title}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {item.meta} | {formatShortDate(item.date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
