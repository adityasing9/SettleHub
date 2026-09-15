import React from 'react';
import { SuggestedSettlement } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface SuggestedSettlementsProps {
  settlements: SuggestedSettlement[];
  onSettle?: (s: SuggestedSettlement) => void;
}

export const SuggestedSettlements: React.FC<SuggestedSettlementsProps> = ({
  settlements,
  onSettle
}) => {
  if (settlements.length === 0) {
    return (
      <Card className="p-5 text-center bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40">
        <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-2">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
          All Group Expenses Settled!
        </h4>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
          No transactions needed to balance accounts.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
        <Sparkles className="w-4 h-4" />
        <span>Smart Suggested Settlements ({settlements.length})</span>
      </div>

      <div className="grid gap-2.5">
        {settlements.map((s, idx) => (
          <Card
            key={idx}
            className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80 border-indigo-100 dark:border-slate-700/80"
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold min-w-0">
              <span className="text-rose-600 dark:text-rose-400 truncate">{s.fromName}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-emerald-600 dark:text-emerald-400 truncate">{s.toName}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(s.amount)}
              </span>
              {onSettle && (
                <Button size="sm" variant="outline" onClick={() => onSettle(s)}>
                  Settle
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
