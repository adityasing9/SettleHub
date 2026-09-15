import React, { useState, useMemo } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { calculateFriendBalance } from '../services/financialEngine';
import { FriendCard } from '../components/friends/FriendCard';
import { AddFriendModal } from '../components/friends/AddFriendModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Search, UserPlus, Users } from 'lucide-react';

interface FriendsProps {
  onOpenAddFriend: () => void;
}

export const Friends: React.FC<FriendsProps> = ({ onOpenAddFriend }) => {
  const { activeFriends } = useFriends();
  const { transactions } = useTransactions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OWES_ME' | 'I_OWE' | 'SETTLED'>('ALL');

  const friendsWithBalances = useMemo(() => {
    return activeFriends.map(f => ({
      friend: f,
      balance: calculateFriendBalance(f.id, f.name, transactions)
    }));
  }, [activeFriends, transactions]);

  const filteredFriends = useMemo(() => {
    return friendsWithBalances.filter(({ friend, balance }) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = friend.name.toLowerCase().includes(q);
        const noteMatch = friend.note?.toLowerCase().includes(q);
        const phoneMatch = friend.phone?.includes(q);
        if (!nameMatch && !noteMatch && !phoneMatch) return false;
      }

      if (filter === 'OWES_ME' && balance.status !== 'OWES_ME') return false;
      if (filter === 'I_OWE' && balance.status !== 'I_OWE') return false;
      if (filter === 'SETTLED' && balance.status !== 'SETTLED') return false;

      return true;
    });
  }, [friendsWithBalances, searchQuery, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Friends</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your friends and track individual running balances
          </p>
        </div>

        <Button onClick={onOpenAddFriend} variant="primary">
          <UserPlus className="w-4 h-4" />
          <span>Add Friend</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search friend name, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="ALL">All Friends</option>
            <option value="OWES_ME">Owes You</option>
            <option value="I_OWE">You Owe</option>
            <option value="SETTLED">Settled</option>
          </Select>
        </div>
      </div>

      {/* Friends List */}
      {filteredFriends.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No Friends Found"
          description={
            searchQuery || filter !== 'ALL'
              ? "No friends match your current filters."
              : "Your friends will appear here once added."
          }
          actionText={searchQuery || filter !== 'ALL' ? undefined : "+ Add Friend"}
          onAction={onOpenAddFriend}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFriends.map(({ friend, balance }) => (
            <FriendCard key={friend.id} friend={friend} balance={balance} />
          ))}
        </div>
      )}
    </div>
  );
};
