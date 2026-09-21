import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useTransactions } from '../../hooks/useTransactions';
import { useToast } from '../../context/ToastContext';
import { SuggestedSettlement, PAYMENT_MODES } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, IndianRupee, ArrowRight, Wallet, Users } from 'lucide-react';

interface GroupSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: SuggestedSettlement | null;
  groupId: string;
  groupName: string;
}

export const GroupSettleModal: React.FC<GroupSettleModalProps> = ({
  isOpen,
  onClose,
  settlement,
  groupId,
  groupName
}) => {
  const { addTransaction } = useTransactions();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [addToPersonalExpense, setAddToPersonalExpense] = useState(true);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isMePayer = settlement?.fromId === 'ME';
  const isMeReceiver = settlement?.toId === 'ME';
  const suggestedAmount = settlement?.amount || 0;

  useEffect(() => {
    if (settlement) {
      setAmount(settlement.amount.toString());
      setNote(`${settlement.fromName} paid ${settlement.toName} (${groupName})`);
      setError('');
    }
  }, [settlement, groupName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlement) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid settlement amount.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Determine payer and receiver friendId:
      // If settlement.toId === 'ME', friendId can be settlement.fromId (payer), with paidById = settlement.fromId
      // If settlement.fromId === 'ME', paidById = 'ME', friendId = settlement.toId
      // If Rahul pays Amit, paidById = rahulId, friendId = amitId
      const paidById = settlement.fromId;
      const friendId = settlement.toId === 'ME' ? settlement.fromId : settlement.toId;

      await addTransaction({
        type: 'SETTLEMENT',
        amount: parsedAmount,
        paidById,
        friendId,
        groupId,
        description: note.trim() || `${settlement.fromName} paid ${settlement.toName}`,
        date: new Date().toISOString(),
        category: isMePayer && addToPersonalExpense ? 'Friend Repayment' : undefined,
        paymentMode: isMePayer && addToPersonalExpense ? paymentMode : undefined
      });

      showToast({
        type: 'success',
        title: 'Group Settlement Recorded!',
        description: `${settlement.fromName} paid ${settlement.toName} ${formatCurrency(parsedAmount)}.`
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  if (!settlement) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Group Settlement"
      subtitle={`Settling debt in "${groupName}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Visual Settlement Flow Banner */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 dark:from-indigo-950/40 dark:via-slate-800/60 dark:to-emerald-950/40 rounded-2xl border border-indigo-100 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            {/* Payer */}
            <div className="text-left flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {isMePayer ? 'You Pay' : 'Payer'}
              </span>
              <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400 truncate">
                {settlement.fromName}
              </p>
            </div>

            {/* Arrow with Amount */}
            <div className="flex flex-col items-center px-2 shrink-0">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {formatCurrency(suggestedAmount)}
              </span>
              <ArrowRight className="w-5 h-5 text-indigo-500 my-0.5" />
            </div>

            {/* Receiver */}
            <div className="text-right flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                {isMeReceiver ? 'You Receive' : 'Receiver'}
              </span>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                {settlement.toName}
              </p>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-indigo-100/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Group: {groupName}</span>
            </span>
            <span>
              {isMePayer
                ? 'You are paying off your group debt'
                : isMeReceiver
                ? 'You are receiving group repayment'
                : 'Direct settlement between group members'}
            </span>
          </div>
        </div>

        {/* Settlement Amount */}
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

        {/* Quick Amounts */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAmount(suggestedAmount.toString())}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 transition-colors"
          >
            Full Amount ({formatCurrency(suggestedAmount)})
          </button>
          {suggestedAmount > 500 && (
            <button
              type="button"
              onClick={() => setAmount((Math.round(suggestedAmount / 2)).toString())}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              Half ({formatCurrency(Math.round(suggestedAmount / 2))})
            </button>
          )}
        </div>

        {/* Note / Description */}
        <Input
          label="Note / Description"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Paid via UPI"
        />

        {/* Personal Expense Tracking if 'ME' is payer */}
        {isMePayer && (
          <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/40 rounded-xl border border-purple-200/80 dark:border-purple-900/50 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={addToPersonalExpense}
                onChange={e => setAddToPersonalExpense(e.target.checked)}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Track as Personal Expense (Friend Repayment)</span>
              </div>
            </label>
            {addToPersonalExpense && (
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
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
            )}
          </div>
        )}

        {/* Actions */}
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
