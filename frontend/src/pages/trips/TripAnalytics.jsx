import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import BudgetWidget from '../../components/BudgetWidget';
import { Card, EmptyState, PageHeader } from '../../components/ui';
import { money } from '../../utils/format';

const COLORS = ['#4f46e5', '#059669', '#f59e0b', '#dc2626', '#0891b2', '#7c3aed', '#64748b'];

const TripAnalytics = () => {
  const { stats, budget } = useOutletContext();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Understand spend patterns, budget usage, and daily trip costs."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <BudgetWidget budget={budget} />
        <Card className="p-6 xl:col-span-2">
          <h2 className="mb-5 text-lg font-semibold text-gray-950 dark:text-gray-50">Daily Spend</h2>
          <div className="h-72">
            {stats?.byDate?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.byDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Line type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No daily data yet" description="Add expenses to see daily spend." />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-950 dark:text-gray-50">Spend by Category</h2>
          <div className="h-80">
            {stats?.byCategory?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.byCategory} dataKey="total" nameKey="category" outerRadius={110} label>
                    {stats.byCategory.map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No category data yet" description="Categorized expenses appear here." />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-950 dark:text-gray-50">Category Bars</h2>
          <div className="h-80">
            {stats?.byCategory?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Bar dataKey="total" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No chart yet" description="Add expenses to populate analytics." />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TripAnalytics;
