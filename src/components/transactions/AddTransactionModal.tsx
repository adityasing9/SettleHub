import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useFriends } from '../../hooks/useFriends';
import { useGroups } from '../../hooks/useGroups';
import { useTransactions } from '../../hooks/useTransactions';
import { useToast } from '../../context/ToastContext';
import { calculateEqualSplit, validateSplit } from '../../services/financialEngine';
import { TransactionType, SplitType, EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../types';
import { IndianRupee, Calendar, FileText, User, Users, PlusCircle, Wallet, Tag, CreditCard } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFriendId?: string;
  defaultGroupId?: string;
  onOpenAddFriend?: () => void;
}

const quickCategorySuggestions = ['Dinner', 'Lunch', 'Cab', 'Movie', 'Coffee', 'Groceries', 'Shopping', 'Fuel', 'Rent'];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultFriendId,
  defaultGroupId,
  onOpenAddFriend
}) => {
  const { activeFriends } = useFriends();
  const { groups } = useGroups();
  const { addTransaction } = useTransactions();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'PERSONAL' | 'INDIVIDUAL' | 'GROUP'>('PERSONAL');
  const [friendId, setFriendId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [paidBy, setPaidBy] = useState<'ME' | string>('ME');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Food & Dining');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [dateTime, setDateTime] = useState('');

  // Group split state
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      // Default date-time string in format YYYY-MM-THH:mm
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDateTime(localISO);

      if (defaultGroupId) {
        setMode('GROUP');
        setGroupId(defaultGroupId);
      } else if (defaultFriendId) {
        setMode('INDIVIDUAL');
        setFriendId(defaultFriendId);
      } else {
        setMode('PERSONAL');
        if (activeFriends.length > 0) {
          setFriendId(activeFriends[0].id);
        }
      }
    }
  }, [isOpen, defaultFriendId, defaultGroupId]);

  // Set initial friendId once when activeFriends loads if not already set
  useEffect(() => {
    if (isOpen && mode === 'INDIVIDUAL' && !defaultFriendId && !friendId && activeFriends.length > 0) {
      setFriendId(activeFriends[0].id);
    }
  }, [isOpen, mode, defaultFriendId, friendId, activeFriends]);

  // When group changes, update selected participants
  useEffect(() => {
    if (groupId) {
      const g = groups.find(item => item.id === groupId);
      if (g) {
        setSelectedParticipants(g.members);
      }
    }
  }, [groupId, groups]);

  const handleParticipantToggle = (id: string) => {
    if (selectedParticipants.includes(id)) {
      if (selectedParticipants.length <= 1) return; // Keep at least 1
      setSelectedParticipants(prev => prev.filter(p => p !== id));
    } else {
      setSelectedParticipants(prev => [...prev, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (mode === 'INDIVIDUAL' && !friendId) {
      setError('Please select a friend.');
      return;
    }

    if (mode === 'GROUP' && !groupId) {
      setError('Please select a group.');
      return;
    }

    let type: TransactionType = 'PERSONAL_EXPENSE';
    let participants;
    let finalPaidById = 'ME';

    if (mode === 'PERSONAL') {
      type = 'PERSONAL_EXPENSE';
      finalPaidById = 'ME';
    } else if (mode === 'GROUP') {
      type = 'GROUP_EXPENSE';
      finalPaidById = paidBy;
      if (selectedParticipants.length === 0) {
        setError('Please select at least one participant.');
        return;
      }

      if (splitType === 'EQUAL') {
        participants = calculateEqualSplit(parsedAmount, selectedParticipants);
      } else {
        // Custom split validation
        participants = selectedParticipants.map(id => ({
          friendId: id,
          shareAmount: parseFloat(customShares[id] || '0') || 0
        }));

        const validation = validateSplit(parsedAmount, participants);
        if (!validation.isValid) {
          setError(
            `Total participant shares must equal ₹${parsedAmount}. Current difference: ₹${validation.difference}`
          );
          return;
        }
      }
    } else {
      type = paidBy === 'ME' ? 'PAID_BY_ME' : 'PAID_BY_FRIEND';
      finalPaidById = paidBy;
    }

    try {
      setLoading(true);
      setError('');

      await addTransaction({
        type,
        amount: parsedAmount,
        friendId: mode === 'INDIVIDUAL' ? friendId : undefined,
        groupId: mode === 'GROUP' ? groupId : undefined,
        category,
        paymentMode,
        description: description.trim() || (mode === 'PERSONAL' ? category : 'Expense'),
        date: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
        paidById: finalPaidById,
        participants,
        splitType: mode === 'GROUP' ? splitType : undefined
      });

      showToast({
        type: 'success',
        title: mode === 'PERSONAL' ? 'Personal Expense Added' : 'Transaction Recorded',
        description: `Added ${description || category || 'expense'} of ₹${parsedAmount}`
      });

      // Reset
      setAmount('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector Tabs (3 Tabs) */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-center gap-1">
          <button
            type="button"
            onClick={() => setMode('PERSONAL')}
            className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'PERSONAL'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Personal</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('INDIVIDUAL')}
            className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'INDIVIDUAL'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Friend Split</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('GROUP')}
            className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'GROUP'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Split</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        {/* Friend Selector (Only for INDIVIDUAL) */}
        {mode === 'INDIVIDUAL' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                Friend involved *
              </label>
              {onOpenAddFriend && (
                <button
                  type="button"
                  onClick={onOpenAddFriend}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Friend
                </button>
              )}
            </div>
            {activeFriends.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                <span>No friends added yet.</span>
                {onOpenAddFriend && (
                  <Button size="sm" onClick={onOpenAddFriend}>
                    Add Friend
                  </Button>
                )}
              </div>
            ) : (
              <Select
                value={friendId}
                onChange={e => {
                  const newId = e.target.value;
                  setFriendId(newId);
                  if (paidBy !== 'ME') {
                    setPaidBy(newId);
                  }
                }}
              >
                {activeFriends.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {/* Group Selector (Only for GROUP) */}
        {mode === 'GROUP' && (
          <div>
            <Select
              label="Select Group *"
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
            >
              <option value="">Select a group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.members.length} members)
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Who Paid? (Only for INDIVIDUAL or GROUP) */}
        {mode !== 'PERSONAL' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Who paid?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaidBy('ME')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  paidBy === 'ME'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-500 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                I paid
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'INDIVIDUAL') {
                    setPaidBy(friendId);
                  } else if (groupId) {
                    const g = groups.find(item => item.id === groupId);
                    const firstFriend = g?.members.find(m => m !== 'ME');
                    if (firstFriend) setPaidBy(firstFriend);
                  }
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  paidBy !== 'ME'
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-500 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {mode === 'INDIVIDUAL'
                  ? (activeFriends.find(f => f.id === friendId)?.name || 'Friend') + ' paid'
                  : 'Friend paid'}
              </button>
            </div>
          </div>
        )}

        {/* Amount */}
        <Input
          label="Amount (₹) *"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => {
            setAmount(e.target.value);
            setError('');
          }}
          leftIcon={<IndianRupee className="w-4 h-4 text-slate-400" />}
        />

        {/* Category & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Category
            </label>
            <Select
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Payment Method
            </label>
            <Select
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value)}
            >
              {PAYMENT_MODES.map(pm => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Description */}
        <div>
          <Input
            label="Description / Note"
            placeholder={mode === 'PERSONAL' ? `e.g. ${category}` : 'e.g. Dinner, Cab, Groceries'}
            value={description}
            onChange={e => setDescription(e.target.value)}
            leftIcon={<FileText className="w-4 h-4 text-slate-400" />}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickCategorySuggestions.map(sugg => (
              <button
                key={sugg}
                type="button"
                onClick={() => setDescription(sugg)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <Input
          label="Date & Time *"
          type="datetime-local"
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
          leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
        />

        {/* Group Expense Split Configuration */}
        {mode === 'GROUP' && groupId && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Split Method
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitType('EQUAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    splitType === 'EQUAL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('CUSTOM')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    splitType === 'CUSTOM'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Participants Checklist / Custom Inputs */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Select Participants ({selectedParticipants.length}):
              </span>
              {groups
                .find(g => g.id === groupId)
                ?.members.map(memberId => {
                  const memberName = memberId === 'ME' ? 'You' : activeFriends.find(f => f.id === memberId)?.name || 'Friend';
                  const isSelected = selectedParticipants.includes(memberId);

                  return (
                    <div
                      key={memberId}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <label className="flex items-center gap-2 font-medium text-slate-900 dark:text-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleParticipantToggle(memberId)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>{memberName}</span>
                      </label>

                      {isSelected && splitType === 'CUSTOM' && (
                        <div className="w-28 flex items-center gap-1">
                          <span>₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={customShares[memberId] || ''}
                            onChange={e =>
                              setCustomShares({ ...customShares, [memberId]: e.target.value })
                            }
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-bold"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
