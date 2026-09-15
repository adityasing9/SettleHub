import React from 'react';
import { clsx } from 'clsx';
import { ArrowUpRight, ArrowDownLeft, Check, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface BalanceBadgeProps {
  status: 'OWES_ME' | 'I_OWE' | 'SETTLED';
  amount?: number;
  showIcon?: boolean;
}

export const BalanceBadge: React.FC<BalanceBadgeProps> = ({
  status,
  amount,
  showIcon = true
}) => {
  if (status === 'OWES_ME') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
        {showIcon && <ArrowDownLeft className="w-3.5 h-3.5" />}
        <span>{amount !== undefined ? `Owes ${formatCurrency(amount)}` : 'Owes you'}</span>
      </span>
    );
  }

  if (status === 'I_OWE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
        {showIcon && <ArrowUpRight className="w-3.5 h-3.5" />}
        <span>{amount !== undefined ? `You owe ${formatCurrency(amount)}` : 'You owe'}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      {showIcon && <Check className="w-3.5 h-3.5 text-slate-500" />}
      <span>Settled</span>
    </span>
  );
};
