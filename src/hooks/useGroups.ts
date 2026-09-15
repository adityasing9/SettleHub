import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db/database';
import { Group } from '../types';

export function useGroups() {
  const groups = useLiveQuery(() => db.groups.toArray(), []) || [];

  const addGroup = async (groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!groupData.name.trim()) {
      throw new Error('Group name is required.');
    }

    const now = new Date().toISOString();
    const newGroup: Group = {
      ...groupData,
      id: generateId(),
      name: groupData.name.trim(),
      createdAt: now,
      updatedAt: now
    };
    await db.groups.add(newGroup);
    return newGroup;
  };

  const updateGroup = async (id: string, updates: Partial<Group>) => {
    const now = new Date().toISOString();
    await db.groups.update(id, {
      ...updates,
      updatedAt: now
    });
  };

  const deleteGroup = async (id: string) => {
    await db.groups.delete(id);
  };

  return {
    groups,
    addGroup,
    updateGroup,
    deleteGroup
  };
}
