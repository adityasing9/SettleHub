import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, Friend, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Users, ChevronRight, TrendingUp } from 'lucide-react';

interface GroupCardProps {
  group: Group;
  friendsMap: Map<string, Friend>;
  groupTransactions: Transaction[];
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  friendsMap,
  groupTransactions
}) => {
  const navigate = useNavigate();

  const totalSpending = groupTransactions
    .filter(t => t.type === 'GROUP_EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card
      onClick={() => navigate(`/groups/${group.id}`)}
      className="p-5 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0 border border-indigo-100 dark:border-slate-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {group.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {group.members.length} members • {groupTransactions.length} transactions
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </div>

      {group.description && (
        <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-1">
          "{group.description}"
        </p>
      )}

      {/* Member Avatars Stack + Total Spending */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex -space-x-2 overflow-hidden">
          {group.members.slice(0, 5).map(memberId => {
            const name = memberId === 'ME' ? 'You' : friendsMap.get(memberId)?.name || 'Friend';
            return <Avatar key={memberId} name={name} size="sm" className="ring-2 ring-white dark:ring-slate-900" />;
          })}
          {group.members.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              +{group.members.length - 5}
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Spending
          </span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
            {formatCurrency(totalSpending)}
          </span>
        </div>
      </div>
    </Card>
  );
};
