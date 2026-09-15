import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useFriends } from '../../hooks/useFriends';
import { useToast } from '../../context/ToastContext';
import { Friend } from '../../types';
import { User, Phone, Mail, FileText } from 'lucide-react';

interface EditFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend | null;
}

export const EditFriendModal: React.FC<EditFriendModalProps> = ({
  isOpen,
  onClose,
  friend
}) => {
  const { updateFriend } = useFriends();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (friend) {
      setName(friend.name);
      setPhone(friend.phone || '');
      setEmail(friend.email || '');
      setNote(friend.note || '');
    }
  }, [friend]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friend) return;
    if (!name.trim()) {
      setError('Friend name is required');
      return;
    }

    try {
      await updateFriend(friend.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        note: note.trim() || undefined
      });

      showToast({
        type: 'success',
        title: 'Friend Updated',
        description: `Details for ${name} updated successfully.`
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update friend');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Friend" subtitle="Update contact details">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Friend Name *"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setError('');
          }}
          error={error}
          leftIcon={<User className="w-4 h-4" />}
        />

        <Input
          label="Phone Number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          leftIcon={<Phone className="w-4 h-4" />}
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <Input
          label="Note"
          value={note}
          onChange={e => setNote(e.target.value)}
          leftIcon={<FileText className="w-4 h-4" />}
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
