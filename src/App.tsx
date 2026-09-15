import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Friends } from './pages/Friends';
import { FriendDetail } from './pages/FriendDetail';
import { Groups } from './pages/Groups';
import { GroupDetail } from './pages/GroupDetail';
import { Statistics } from './pages/Statistics';
import { Settings } from './pages/Settings';

import { AddTransactionModal } from './components/transactions/AddTransactionModal';
import { AddFriendModal } from './components/friends/AddFriendModal';
import { AddGroupModal } from './components/groups/AddGroupModal';
import { SettleUpModal } from './components/transactions/SettleUpModal';
import { useFriends } from './hooks/useFriends';
import { useTransactions } from './hooks/useTransactions';
import { calculateFriendBalance } from './services/financialEngine';

export const AppContent: React.FC = () => {
  const { friends } = useFriends();
  const { transactions } = useTransactions();

  // Modal states
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);

  // Prefill modal props
  const [txDefaultFriendId, setTxDefaultFriendId] = useState<string | undefined>();
  const [txDefaultGroupId, setTxDefaultGroupId] = useState<string | undefined>();

  // SettleUp Modal global trigger from group detail or dashboard
  const [settleFriendId, setSettleFriendId] = useState<string | null>(null);

  const handleOpenAddTxWithFriend = (friendId?: string) => {
    setTxDefaultFriendId(friendId);
    setTxDefaultGroupId(undefined);
    setIsAddTransactionOpen(true);
  };

  const handleOpenAddTxWithGroup = (groupId: string) => {
    setTxDefaultGroupId(groupId);
    setTxDefaultFriendId(undefined);
    setIsAddTransactionOpen(true);
  };

  const settleFriend = friends.find(f => f.id === settleFriendId) || null;
  const settleBalance = settleFriend ? calculateFriendBalance(settleFriend.id, settleFriend.name, transactions) : null;

  return (
    <AppLayout
      onOpenAddTransaction={() => handleOpenAddTxWithFriend()}
    >
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              onOpenAddTransaction={() => handleOpenAddTxWithFriend()}
              onOpenAddFriend={() => setIsAddFriendOpen(true)}
            />
          }
        />
        <Route
          path="/transactions"
          element={
            <Transactions
              onOpenAddTransaction={() => handleOpenAddTxWithFriend()}
            />
          }
        />
        <Route
          path="/friends"
          element={
            <Friends
              onOpenAddFriend={() => setIsAddFriendOpen(true)}
            />
          }
        />
        <Route
          path="/friends/:id"
          element={
            <FriendDetail
              onOpenAddTransaction={handleOpenAddTxWithFriend}
            />
          }
        />
        <Route
          path="/groups"
          element={
            <Groups
              onOpenAddGroup={() => setIsAddGroupOpen(true)}
              onOpenAddFriend={() => setIsAddFriendOpen(true)}
            />
          }
        />
        <Route
          path="/groups/:id"
          element={
            <GroupDetail
              onOpenAddGroupExpense={handleOpenAddTxWithGroup}
              onOpenSettleUpModal={(friendId) => setSettleFriendId(friendId)}
            />
          }
        />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        defaultFriendId={txDefaultFriendId}
        defaultGroupId={txDefaultGroupId}
        onOpenAddFriend={() => {
          setIsAddTransactionOpen(false);
          setIsAddFriendOpen(true);
        }}
      />

      <AddFriendModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />

      <AddGroupModal
        isOpen={isAddGroupOpen}
        onClose={() => setIsAddGroupOpen(false)}
        onOpenAddFriend={() => setIsAddFriendOpen(true)}
      />

      {settleFriend && settleBalance && (
        <SettleUpModal
          isOpen={!!settleFriendId}
          onClose={() => setSettleFriendId(null)}
          friend={settleFriend}
          balance={settleBalance}
        />
      )}
    </AppLayout>
  );
};

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
}
