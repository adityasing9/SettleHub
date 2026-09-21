import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useTransactions } from '../../hooks/useTransactions';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../context/ToastContext';
import { Transaction, EXPENSE_CATEGORIES, PAYMENT_MODES } from '../../types';
import { IndianRupee, FileText, Calendar } from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const { updateTransaction } = useTransactions();
  const { activeFriends } = useFriends();
  const { showToast } = useToast();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('ME');
  const [category, setCategory] = useState('Food & Dining');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [dateTime, setDateTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setPaidBy(transaction.paidById || 'ME');
      setCategory(transaction.category || 'General');
      setPaymentMode(transaction.paymentMode || 'UPI');
      try {
        const d = new Date(transaction.date);
        const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDateTime(localISO);
      } catch (e) {
        setDateTime('');
      }
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      let updatedType = transaction.type;
      if (transaction.type === 'PAID_BY_ME' || transaction.type === 'PAID_BY_FRIEND') {
        updatedType = paidBy === 'ME' ? 'PAID_BY_ME' : 'PAID_BY_FRIEND';
      }

      await updateTransaction(transaction.id, {
        description: description.trim(),
        amount: parsedAmount,
        paidById: transaction.type === 'PERSONAL_EXPENSE' ? 'ME' : paidBy,
        type: updatedType,
        category,
        paymentMode,
        date: dateTime ? new Date(dateTime).toISOString() : transaction.date
      });

      showToast({
        type: 'success',
        title: 'Transaction Updated',
        description: 'Changes saved successfully.'
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction');
    }
  };

  if (!transaction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Transaction" subtitle="Modify expense details">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Amount (₹) *"
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          leftIcon={<IndianRupee className="w-4 h-4 text-slate-400" />}
        />

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

        <Input
          label="Description *"
          value={description}
          onChange={e => setDescription(e.target.value)}
          leftIcon={<FileText className="w-4 h-4 text-slate-400" />}
        />

        {transaction.type !== 'GROUP_EXPENSE' && transaction.type !== 'PERSONAL_EXPENSE' && (
          <Select
            label="Paid By *"
            value={paidBy}
            onChange={e => setPaidBy(e.target.value)}
          >
            <option value="ME">I paid</option>
            {activeFriends.map(f => (
              <option key={f.id} value={f.id}>
                {f.name} paid
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Date & Time *"
          type="datetime-local"
          value={dateTime}
          onChange={e => setDateTime(e.target.value)}
          leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
