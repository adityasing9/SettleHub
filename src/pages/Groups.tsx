import React, { useState } from 'react';
import { useGroups } from '../hooks/useGroups';
import { useFriends } from '../hooks/useFriends';
import { useTransactions } from '../hooks/useTransactions';
import { GroupCard } from '../components/groups/GroupCard';
import { AddGroupModal } from '../components/groups/AddGroupModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, UserPlus, Users } from 'lucide-react';

interface GroupsProps {
  onOpenAddGroup: () => void;
  onOpenAddFriend: () => void;
}

export const Groups: React.FC<GroupsProps> = ({ onOpenAddGroup, onOpenAddFriend }) => {
  const { groups } = useGroups();
  const { activeFriends } = useFriends();
  const { transactions } = useTransactions();

  const [searchQuery, setSearchQuery] = useState('');
  const friendsMap = new Map(activeFriends.map(f => [f.id, f]));

  const filteredGroups = groups.filter(g => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Expense Groups</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize shared trips, roommate bills, and group events
          </p>
        </div>

        <Button onClick={onOpenAddGroup} variant="primary">
          <UserPlus className="w-4 h-4" />
          <span>Create Group</span>
        </Button>
      </div>

      {/* Search Input */}
      <Input
        placeholder="Search group name or description..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Group List */}
      {filteredGroups.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No Groups Found"
          description={
            searchQuery
              ? "No groups match your search term."
              : "Create a group for trips, roommates, or shared project expenses."
          }
          actionText={searchQuery ? undefined : "Create Group"}
          onAction={onOpenAddGroup}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map(group => {
            const groupTransactions = transactions.filter(t => t.groupId === group.id);
            return (
              <GroupCard
                key={group.id}
                group={group}
                friendsMap={friendsMap}
                groupTransactions={groupTransactions}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
