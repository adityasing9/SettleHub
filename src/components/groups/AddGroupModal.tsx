import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useGroups } from '../../hooks/useGroups';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../context/ToastContext';
import { Users, FileText, CheckCircle2 } from 'lucide-react';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
  onOpenAddFriend?: () => void;
}

const presetGroups = ['Goa Trip', 'Roommates', 'College Friends', 'Project Team', 'Weekend Trip'];

export const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenAddFriend
}) => {
  const { addGroup } = useGroups();
  const { activeFriends } = useFriends();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['ME']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMemberToggle = (id: string) => {
    if (id === 'ME') return; // ME is always included
    if (selectedMembers.includes(id)) {
      setSelectedMembers(prev => prev.filter(m => m !== id));
    } else {
      setSelectedMembers(prev => [...prev, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const newGroup = await addGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        members: selectedMembers
      });

      showToast({
        type: 'success',
        title: 'Group Created',
        description: `Group "${newGroup.name}" created with ${selectedMembers.length} members.`
      });

      setName('');
      setDescription('');
      setSelectedMembers(['ME']);
      onClose();
      if (onSuccess) onSuccess(newGroup.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Group" subtitle="Group expenses with friends">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/80 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </div>
        )}

        <Input
          label="Group Name *"
          placeholder="e.g. Goa Trip"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setError('');
          }}
          leftIcon={<Users className="w-4 h-4 text-slate-400" />}
          autoFocus
        />

        <div className="flex flex-wrap gap-1.5">
          {presetGroups.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => setName(preset)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>

        <Input
          label="Description (Optional)"
          placeholder="e.g. Shared trip expenses"
          value={description}
          onChange={e => setDescription(e.target.value)}
          leftIcon={<FileText className="w-4 h-4 text-slate-400" />}
        />

        {/* Member Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
              Group Members ({selectedMembers.length})
            </label>
            {onOpenAddFriend && (
              <button
                type="button"
                onClick={onOpenAddFriend}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                + Add Friend
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto p-1">
            {/* Always include ME */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              <span>You (Me)</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>

            {activeFriends.map(f => {
              const isSelected = selectedMembers.includes(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() => handleMemberToggle(f.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-50 dark:bg-slate-800 border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span>{f.name}</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
