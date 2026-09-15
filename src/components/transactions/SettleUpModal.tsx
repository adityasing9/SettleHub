import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useTransactions } from '../../hooks/useTransactions';
import { useToast } from '../../context/ToastContext';
import { Friend, FriendBalance } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, IndianRupee, ArrowRight } from 'lucide-react';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
  balance: FriendBalance | null;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  friend,
  balance
}) => {
  const { addTransaction } = useTransactions();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwesMe = balance ? balance.netBalance > 0 : false;
  const absBalance = balance ? Math.abs(balance.netBalance) : 0;

  useEffect(() => {
    if (balance) {
      setAmount(absBalance.toString());
      setNote(isOwesMe ? `Settlement from ${balance.friendName}` : `Payment to ${balance.friendName}`);
    }
  }, [balance, absBalance, isOwesMe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friend || !balance) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid settlement amount.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // PaidBy: If friend owes me, friend is paying me (`paidById = friend.id`).
      // If I owe friend, I am paying friend (`paidById = 'ME'`).
      const paidById = isOwesMe ? friend.id : 'ME';

      await addTransaction({
        type: 'SETTLEMENT',
        amount: parsedAmount,
        friendId: friend.id,
        description: note.trim() || 'Settlement',
        date: new Date().toISOString(),
        paidById
      });

      const remaining = Math.round((absBalance - parsedAmount) * 100) / 100;

      showToast({
        type: 'success',
        title: remaining <= 0 ? 'Fully Settled!' : 'Partial Settlement Recorded',
        description:
          remaining <= 0
            ? `Balance with ${friend.name} is now ₹0.`
            : `Recorded payment of ₹${parsedAmount}. Remaining: ₹${remaining}.`
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  if (!friend || !balance) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Settle Up with ${friend.name}`}
      subtitle="Record full or partial payment"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Balance Banner */}
        <div className="p-4 bg-indigo-50 dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Current Status
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {isOwesMe ? `${friend.name} owes you` : `You owe ${friend.name}`}
            </span>
            <span
              className={`text-lg font-black ${
                isOwesMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(absBalance)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <Input
          label="Settlement Amount (₹) *"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => {
            setAmount(e.target.value);
            setError('');
          }}
          error={error}
          leftIcon={<IndianRupee className="w-4 h-4 text-slate-400" />}
        />

        {/* Full vs Quick Amounts */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAmount(absBalance.toString())}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition-colors"
          >
            Full Amount ({formatCurrency(absBalance)})
          </button>
          {absBalance > 500 && (
            <button
              type="button"
              onClick={() => setAmount((Math.round(absBalance / 2)).toString())}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              Half ({formatCurrency(Math.round(absBalance / 2))})
            </button>
          )}
        </div>

        <Input
          label="Note / Description"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Paid via UPI"
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={loading}>
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Settlement</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
