import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db/database';
import { Friend } from '../types';

export function useFriends() {
  const friends = useLiveQuery(() => db.friends.toArray(), []) || [];
  const activeFriends = friends.filter(f => !f.isArchived);

  const addFriend = async (friendData: Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Check duplicate name
    const existing = friends.find(
      f => f.name.trim().toLowerCase() === friendData.name.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Friend with name "${friendData.name}" already exists.`);
    }

    const now = new Date().toISOString();
    const newFriend: Friend = {
      ...friendData,
      id: generateId(),
      name: friendData.name.trim(),
      createdAt: now,
      updatedAt: now
    };
    await db.friends.add(newFriend);
    return newFriend;
  };

  const updateFriend = async (id: string, updates: Partial<Friend>) => {
    const now = new Date().toISOString();
    await db.friends.update(id, {
      ...updates,
      updatedAt: now
    });
  };

  const archiveFriend = async (id: string) => {
    await updateFriend(id, { isArchived: true });
  };

  const deleteFriend = async (id: string) => {
    await db.friends.delete(id);
  };

  return {
    friends,
    activeFriends,
    addFriend,
    updateFriend,
    archiveFriend,
    deleteFriend
  };
}
