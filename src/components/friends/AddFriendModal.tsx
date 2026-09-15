import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../context/ToastContext';
import { User, Phone, Mail, FileText } from 'lucide-react';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (friendId: string) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { addFriend } = useFriends();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Friend name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const newFriend = await addFriend({
        name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        note: note.trim() || undefined
      });

      showToast({
        type: 'success',
        title: 'Friend Added',
        description: `${newFriend.name} has been added to your friends list.`
      });

      setName('');
      setPhone('');
      setEmail('');
      setNote('');
      onClose();
      if (onSuccess) onSuccess(newFriend.id);
    } catch (err: any) {
      setError(err.message || 'Failed to add friend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Friend" subtitle="Add a friend to split expenses with">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Friend Name *"
          placeholder="e.g. Rahul Sharma"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setError('');
          }}
          error={error}
          leftIcon={<User className="w-4 h-4" />}
          autoFocus
        />

        <Input
          label="Phone Number (Optional)"
          placeholder="e.g. +91 98765 43210"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          leftIcon={<Phone className="w-4 h-4" />}
        />

        <Input
          label="Email Address (Optional)"
          type="email"
          placeholder="e.g. rahul@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Note (Optional)"
          placeholder="e.g. College roommate"
          value={note}
          onChange={e => setNote(e.target.value)}
          leftIcon={<FileText className="w-4 h-4" />}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Save Friend'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
