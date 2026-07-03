import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Member, Expense, Settlement } from '../utils/settlementEngine';

export interface Group {
  id: string;
  name: string;
  description?: string;
  category: 'trip' | 'home' | 'office' | 'family' | 'college' | 'business' | 'other';
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  files: GroupFile[];
  createdAt: string;
}

export interface GroupFile {
  id: string;
  name: string;
  url: string;
  uploadedBy: string;
  date: string;
  size: string;
}

export interface BorrowLend {
  id: string;
  type: 'borrow' | 'lend';
  personId: string;
  amount: number;
  description: string;
  date: string;
  dueDate?: string;
  isCompleted: boolean;
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  date: string;
  isRead: boolean;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  groupName?: string;
  type: 'expense' | 'settlement' | 'group' | 'borrowlend';
}

interface AppContextType {
  currentUser: Member;
  members: Member[];
  groups: Group[];
  borrowLends: BorrowLend[];
  notifications: Notification[];
  activities: Activity[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  addMember: (name: string, email?: string) => Member;
  createGroup: (name: string, category: Group['category'], description?: string, memberIds?: string[]) => Group;
  deleteGroup: (groupId: string) => void;
  addExpense: (groupId: string, expenseData: Omit<Expense, 'id'>) => Expense;
  deleteExpense: (groupId: string, expenseId: string) => void;
  addSettlement: (groupId: string, settlementData: Omit<Settlement, 'id'>) => Settlement;
  toggleSettlementStatus: (groupId: string, settlementId: string) => void;
  addBorrowLend: (data: Omit<BorrowLend, 'id'>) => BorrowLend;
  toggleBorrowLendStatus: (id: string) => void;
  deleteBorrowLend: (id: string) => void;
  uploadFile: (groupId: string, name: string, size: string, url: string) => void;
  addMemberToGroup: (groupId: string, memberId: string) => void;
  markAllNotificationsRead: () => void;
  clearNotification: (id: string) => void;
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Mock Data to seed the application
const DEFAULT_CURRENT_USER: Member = { id: 'u-1', name: 'Aadi (You)', email: 'aadi@settlehub.com' };

const DEFAULT_MEMBERS: Member[] = [
  DEFAULT_CURRENT_USER,
  { id: 'u-2', name: 'Ishan Sharma', email: 'ishan@gmail.com' },
  { id: 'u-3', name: 'Shruti Iyer', email: 'shruti@outlook.com' },
  { id: 'u-4', name: 'Kabir Mehta', email: 'kabir@yahoo.com' },
  { id: 'u-5', name: 'Sneha Patel', email: 'sneha@gmail.com' },
  { id: 'u-6', name: 'Rahul Sen', email: 'rahul@gmail.com' },
];

const DEFAULT_GROUPS: Group[] = [
  {
    id: 'g-1',
    name: 'Pondicherry Trip',
    description: 'Weekend getaway with the gang in Pondy! Beaches, food, and fun.',
    category: 'trip',
    members: [DEFAULT_MEMBERS[0], DEFAULT_MEMBERS[1], DEFAULT_MEMBERS[2], DEFAULT_MEMBERS[3]],
    expenses: [
      {
        id: 'e-1',
        title: 'Airbnb Villa Booking',
        amount: 450,
        paidById: 'u-1', // Aadi
        participants: ['u-1', 'u-2', 'u-3', 'u-4'],
        splitType: 'equal',
        splits: {},
        category: 'Accommodation',
        date: '2026-06-25',
        notes: 'Villa booked for 3 nights near Serenity Beach',
      },
      {
        id: 'e-2',
        title: 'French Dinner at Villa Shanti',
        amount: 160,
        paidById: 'u-2', // Ishan
        participants: ['u-1', 'u-2', 'u-3', 'u-4'],
        splitType: 'custom',
        splits: { 'u-1': 50, 'u-2': 30, 'u-3': 40, 'u-4': 40 },
        category: 'Food',
        date: '2026-06-26',
        notes: 'Aadi had the lobster!',
      },
      {
        id: 'e-3',
        title: 'Fuel & Highway Tolls',
        amount: 80,
        paidById: 'u-3', // Shruti
        participants: ['u-1', 'u-2', 'u-3'],
        splitType: 'shares',
        splits: { 'u-1': 2, 'u-2': 1, 'u-3': 1 }, // Aadi travel twice as much
        category: 'Transport',
        date: '2026-06-25',
      }
    ],
    settlements: [
      {
        id: 's-1',
        fromId: 'u-4', // Kabir
        toId: 'u-1', // Aadi
        amount: 112.50,
        date: '2026-06-28',
        notes: 'Paid via GPay',
        isCompleted: true,
      }
    ],
    files: [
      {
        id: 'f-1',
        name: 'villa_invoice.pdf',
        url: '#',
        uploadedBy: 'Aadi (You)',
        date: '2026-06-25',
        size: '1.2 MB'
      }
    ],
    createdAt: '2026-06-24',
  },
  {
    id: 'g-2',
    name: 'Flat 203 Roommates',
    description: 'Monthly shared expenses for Flat 203 roommates.',
    category: 'home',
    members: [DEFAULT_MEMBERS[0], DEFAULT_MEMBERS[2], DEFAULT_MEMBERS[4]], // Aadi, Shruti, Sneha
    expenses: [
      {
        id: 'e-4',
        title: 'Monthly Rent',
        amount: 1200,
        paidById: 'u-1', // Aadi paid rent
        participants: ['u-1', 'u-2', 'u-5'], // Rent is split equally
        splitType: 'equal',
        splits: {},
        category: 'Rent',
        date: '2026-07-01',
      },
      {
        id: 'e-5',
        title: 'Groceries & Supplies',
        amount: 300,
        paidById: 'u-5', // Sneha
        participants: ['u-1', 'u-2', 'u-5'],
        splitType: 'percentage',
        splits: { 'u-1': 40, 'u-2': 30, 'u-5': 30 }, // Aadi consumes more groceries
        category: 'Groceries',
        date: '2026-07-02',
      }
    ],
    settlements: [],
    files: [],
    createdAt: '2026-05-01',
  }
];

const DEFAULT_BORROW_LENDS: BorrowLend[] = [
  {
    id: 'bl-1',
    type: 'lend',
    personId: 'u-6', // Rahul
    amount: 120,
    description: 'Coldplay Concert Ticket booking',
    date: '2026-06-30',
    dueDate: '2026-07-15',
    isCompleted: false,
    notes: 'Booked together, Rahul will transfer next week.'
  },
  {
    id: 'bl-2',
    type: 'borrow',
    personId: 'u-5', // Sneha
    amount: 35,
    description: 'Shared cab to airport',
    date: '2026-07-02',
    isCompleted: false,
  }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    title: 'Pending Settlement',
    message: 'Sneha has requested you to settle $35 for the Shared cab.',
    type: 'alert',
    date: '2026-07-02T18:30:00Z',
    isRead: false,
  },
  {
    id: 'n-2',
    title: 'Payment Completed',
    message: 'Kabir Mehta settled $112.50 to you for Pondicherry Trip.',
    type: 'success',
    date: '2026-06-28T14:15:00Z',
    isRead: true,
  }
];

const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: 'a-1',
    title: 'Expense Added',
    description: 'Sneha Patel added Groceries & Supplies ($300)',
    date: '2026-07-02T10:15:00Z',
    groupName: 'Flat 203 Roommates',
    type: 'expense',
  },
  {
    id: 'a-2',
    title: 'Rent Logged',
    description: 'Aadi (You) paid Monthly Rent ($1200)',
    date: '2026-07-01T09:00:00Z',
    groupName: 'Flat 203 Roommates',
    type: 'expense',
  },
  {
    id: 'a-3',
    title: 'Personal Loan',
    description: 'You lent $120 to Rahul Sen for Coldplay Concert Ticket',
    date: '2026-06-30T16:45:00Z',
    type: 'borrowlend',
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage if present, otherwise use default mock data
  const [currentUser] = useState<Member>(DEFAULT_CURRENT_USER);
  const [members, setMembers] = useState<Member[]>(() => {
    const local = localStorage.getItem('sh_members');
    return local ? JSON.parse(local) : DEFAULT_MEMBERS;
  });
  const [groups, setGroups] = useState<Group[]>(() => {
    const local = localStorage.getItem('sh_groups');
    return local ? JSON.parse(local) : DEFAULT_GROUPS;
  });
  const [borrowLends, setBorrowLends] = useState<BorrowLend[]>(() => {
    const local = localStorage.getItem('sh_borrow_lends');
    return local ? JSON.parse(local) : DEFAULT_BORROW_LENDS;
  });
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const local = localStorage.getItem('sh_notifications');
    return local ? JSON.parse(local) : DEFAULT_NOTIFICATIONS;
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const local = localStorage.getItem('sh_activities');
    return local ? JSON.parse(local) : DEFAULT_ACTIVITIES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const local = localStorage.getItem('sh_theme');
    return (local as 'light' | 'dark') || 'dark'; // default to dark per preference, togglable
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Synchronize with localStorage on change
  useEffect(() => {
    localStorage.setItem('sh_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('sh_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('sh_borrow_lends', JSON.stringify(borrowLends));
  }, [borrowLends]);

  useEffect(() => {
    localStorage.setItem('sh_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('sh_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('sh_theme', theme);
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
  }, [theme]);

  // Network listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addNotification('Connection Restored', 'You are back online. Ready to sync!', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      addNotification('Working Offline', 'Offline mode active. Changes will save locally.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const addNotification = (title: string, message: string, type: Notification['type']) => {
    const newNotif: Notification = {
      id: `n-${Date.now()}`,
      title,
      message,
      type,
      date: new Date().toISOString(),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const logActivity = (title: string, description: string, type: Activity['type'], groupName?: string) => {
    const newActivity: Activity = {
      id: `a-${Date.now()}`,
      title,
      description,
      date: new Date().toISOString(),
      groupName,
      type,
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  // State manipulation methods
  const addMember = (name: string, email?: string) => {
    const newMember: Member = {
      id: `u-${Date.now()}`,
      name,
      email,
    };
    setMembers((prev) => [...prev, newMember]);
    return newMember;
  };

  const createGroup = (name: string, category: Group['category'], description?: string, memberIds: string[] = []) => {
    const selectedMembers = members.filter((m) => memberIds.includes(m.id));
    // Always ensure current user is part of a newly created group
    if (!selectedMembers.some((m) => m.id === currentUser.id)) {
      selectedMembers.unshift(currentUser);
    }

    const newGroup: Group = {
      id: `g-${Date.now()}`,
      name,
      description,
      category,
      members: selectedMembers,
      expenses: [],
      settlements: [],
      files: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    setGroups((prev) => [...prev, newGroup]);
    logActivity('New Group Created', `Group "${name}" was created by you.`, 'group', name);
    addNotification('Group Created', `You created a new group: ${name}`, 'success');
    return newGroup;
  };

  const deleteGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    logActivity('Group Deleted', `Group "${group.name}" was deleted.`, 'group');
  };

  const addExpense = (groupId: string, expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `e-${Date.now()}`,
    };

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            expenses: [...g.expenses, newExpense],
          };
        }
        return g;
      })
    );

    const group = groups.find((g) => g.id === groupId);
    const paidByMember = members.find((m) => m.id === expenseData.paidById);
    const payerName = paidByMember ? paidByMember.name : 'Someone';

    logActivity(
      'Expense Added',
      `${payerName} added "${newExpense.title}" ($${newExpense.amount})`,
      'expense',
      group?.name
    );
    addNotification(
      'Expense Added',
      `${payerName} added "${newExpense.title}" ($${newExpense.amount}) in ${group?.name || 'Group'}`,
      'info'
    );

    return newExpense;
  };

  const deleteExpense = (groupId: string, expenseId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const expense = group.expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            expenses: g.expenses.filter((e) => e.id !== expenseId),
          };
        }
        return g;
      })
    );

    logActivity('Expense Removed', `"${expense.title}" ($${expense.amount}) was deleted`, 'expense', group.name);
  };

  const addSettlement = (groupId: string, settlementData: Omit<Settlement, 'id'>) => {
    const newSettlement: Settlement = {
      ...settlementData,
      id: `s-${Date.now()}`,
    };

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            settlements: [...g.settlements, newSettlement],
          };
        }
        return g;
      })
    );

    const group = groups.find((g) => g.id === groupId);
    const fromMember = members.find((m) => m.id === settlementData.fromId);
    const toMember = members.find((m) => m.id === settlementData.toId);

    const activityDesc = `${fromMember?.name} paid ${toMember?.name} $${settlementData.amount}`;
    logActivity('Settlement Logged', activityDesc, 'settlement', group?.name);
    addNotification('Settlement Recorded', activityDesc + ` in ${group?.name}`, 'success');

    return newSettlement;
  };

  const toggleSettlementStatus = (groupId: string, settlementId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            settlements: g.settlements.map((s) =>
              s.id === settlementId ? { ...s, isCompleted: !s.isCompleted } : s
            ),
          };
        }
        return g;
      })
    );
  };

  const addBorrowLend = (data: Omit<BorrowLend, 'id'>) => {
    const newRecord: BorrowLend = {
      ...data,
      id: `bl-${Date.now()}`,
    };

    setBorrowLends((prev) => [newRecord, ...prev]);

    const person = members.find((m) => m.id === data.personId);
    const personName = person ? person.name : 'Unknown Person';

    const activityDesc =
      data.type === 'lend'
        ? `You lent $${data.amount} to ${personName} for "${data.description}"`
        : `You borrowed $${data.amount} from ${personName} for "${data.description}"`;

    logActivity('Borrow/Lend Logged', activityDesc, 'borrowlend');
    addNotification('Ledger Updated', activityDesc, 'info');

    return newRecord;
  };

  const toggleBorrowLendStatus = (id: string) => {
    setBorrowLends((prev) =>
      prev.map((bl) => {
        if (bl.id === id) {
          const updatedStatus = !bl.isCompleted;
          const person = members.find((m) => m.id === bl.personId);
          const personName = person ? person.name : 'Unknown Person';
          
          if (updatedStatus) {
            logActivity(
              'Debt Settled',
              `Personal debt of $${bl.amount} with ${personName} marked as completed.`,
              'borrowlend'
            );
          }
          return { ...bl, isCompleted: updatedStatus };
        }
        return bl;
      })
    );
  };

  const deleteBorrowLend = (id: string) => {
    setBorrowLends((prev) => prev.filter((bl) => bl.id !== id));
  };

  const uploadFile = (groupId: string, name: string, size: string, url: string) => {
    const newFile: GroupFile = {
      id: `f-${Date.now()}`,
      name,
      url,
      uploadedBy: 'Aadi (You)',
      date: new Date().toISOString().split('T')[0],
      size,
    };

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            files: [...g.files, newFile],
          };
        }
        return g;
      })
    );

    const group = groups.find((g) => g.id === groupId);
    logActivity('File Uploaded', `Uploaded "${name}" to ${group?.name}`, 'group', group?.name);
  };

  const addMemberToGroup = (groupId: string, memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          if (g.members.some((m) => m.id === memberId)) return g;
          return {
            ...g,
            members: [...g.members, member],
          };
        }
        return g;
      })
    );

    const group = groups.find((g) => g.id === groupId);
    logActivity('Member Added', `${member.name} was added to ${group?.name || 'Group'}`, 'group', group?.name);
    addNotification('Member Joined', `${member.name} joined the group ${group?.name || 'Group'}`, 'success');
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const triggerSync = async () => {
    if (isOffline) {
      addNotification('Sync Failed', 'Cannot synchronize. You are offline.', 'alert');
      return;
    }
    
    setIsSyncing(true);
    // Simulate API network roundtrip
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSyncing(false);
    
    addNotification('Sync Complete', 'SettleHub database successfully synced with cloud servers.', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        members,
        groups,
        borrowLends,
        notifications,
        activities,
        searchQuery,
        setSearchQuery,
        theme,
        toggleTheme,
        isOffline,
        setIsOffline,
        addMember,
        createGroup,
        deleteGroup,
        addExpense,
        deleteExpense,
        addSettlement,
        toggleSettlementStatus,
        addBorrowLend,
        toggleBorrowLendStatus,
        deleteBorrowLend,
        uploadFile,
        addMemberToGroup,
        markAllNotificationsRead,
        clearNotification,
        triggerSync,
        isSyncing,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
