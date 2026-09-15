import React from 'react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';

interface SpendingChartProps {
  data: { month: string; amount: number }[];
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ data }) => {
  const maxAmount = Math.max(...data.map(d => d.amount), 100);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Monthly Spending Overview
        </h3>
        <span className="text-xs text-slate-400 font-medium">Last 6 Months</span>
      </div>

      <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
        {data.map((item, index) => {
          const heightPercent = Math.max((item.amount / maxAmount) * 100, 4);
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              {/* Tooltip value */}
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatCurrency(item.amount)}
              </span>
              {/* Bar */}
              <div
                style={{ height: `${heightPercent}%` }}
                className="w-full max-w-[36px] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all group-hover:brightness-110 shadow-sm"
              />
              {/* Month label */}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
