import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { BalanceBadge } from '../ui/Badge';
import { Friend, FriendBalance } from '../../types';
import { ChevronRight } from 'lucide-react';

interface FriendCardProps {
  friend: Friend;
  balance: FriendBalance;
  onSettleUp?: (friend: Friend) => void;
}

export const FriendCard: React.FC<FriendCardProps> = ({ friend, balance, onSettleUp }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/friends/${friend.id}`)}
      className="p-4 flex items-center justify-between cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <Avatar name={friend.name} size="md" />
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {friend.name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {friend.phone || friend.note || 'No contact notes'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <div className="text-right">
          <BalanceBadge status={balance.status} amount={balance.netBalance} />
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Card>
  );
};
