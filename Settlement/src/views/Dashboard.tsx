import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, Wallet, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateBalances, simplifyDebts } from '../utils/settlementEngine';

interface DashboardProps {
  setView: (view: string) => void;
  setSelectedGroupId: (id: string | null) => void;
  onTriggerAction: (action: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView, setSelectedGroupId, onTriggerAction }) => {
  const { groups, borrowLends, members, activities } = useApp();

  // Aggregate stats across all groups and personal lend/borrow
  const dashboardStats = useMemo(() => {
    let groupToReceive = 0;
    let groupToPay = 0;
    const simplifiedTransactions: { groupId: string; groupName: string; fromId: string; toId: string; amount: number }[] = [];

    // Calculate simplified debts across all groups
    groups.forEach((g) => {
      const balances = calculateBalances(g.members, g.expenses, g.settlements);
      const simplified = simplifyDebts(balances);
      simplified.forEach((tx) => {
        simplifiedTransactions.push({
          groupId: g.id,
          groupName: g.name,
          ...tx
        });
        if (tx.fromId === 'u-1') {
          groupToPay += tx.amount;
        } else if (tx.toId === 'u-1') {
          groupToReceive += tx.amount;
        }
      });
    });

    // Add personal borrow/lends
    let personalToReceive = 0;
    let personalToPay = 0;

    borrowLends.forEach((bl) => {
      if (!bl.isCompleted) {
        if (bl.type === 'lend') {
          personalToReceive += bl.amount;
        } else {
          personalToPay += bl.amount;
        }
      }
    });

    const totalToReceive = groupToReceive + personalToReceive;
    const totalToPay = groupToPay + personalToPay;
    const netBalance = totalToReceive - totalToPay;

    // Pending transactions list for Quick Settle
    const myGroupDebts = simplifiedTransactions.filter(tx => tx.fromId === 'u-1' || tx.toId === 'u-1');

    return {
      totalToReceive,
      totalToPay,
      netBalance,
      myGroupDebts
    };
  }, [groups, borrowLends]);

  // Spending data aggregated for charts
  const chartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const monthlySpending: Record<string, number> = {};
    const memberSpendings: Record<string, number> = {};
    let totalSpent = 0;

    groups.forEach((g) => {
      g.expenses.forEach((e) => {
        // Aggregate categories
        const cat = e.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
        
        // Aggregate total
        totalSpent += e.amount;

        // Aggregate over time (by month/date string)
        const dateStr = e.date.substring(0, 7); // YYYY-MM
        monthlySpending[dateStr] = (monthlySpending[dateStr] || 0) + e.amount;

        // Aggregate member spendings (who spent how much)
        const member = members.find((m) => m.id === e.paidById);
        if (member) {
          memberSpendings[member.name] = (memberSpendings[member.name] || 0) + e.amount;
        }
      });
    });

    return {
      categoryTotals: Object.entries(categoryTotals).map(([name, value]) => ({ name, value })),
      monthlySpending: Object.entries(monthlySpending).map(([date, value]) => ({ date, value })).sort((a,b)=>a.date.localeCompare(b.date)),
      memberSpendings: Object.entries(memberSpendings).map(([name, value]) => ({ name, value })),
      totalSpent
    };
  }, [groups, members]);

  const getMemberName = (id: string) => {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  };

  const handleQuickSettle = (groupId: string) => {
    setSelectedGroupId(groupId);
    setView('groups');
    // Open settlements tab inside the group
    setTimeout(() => {
      onTriggerAction('open-settlements-tab');
    }, 100);
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title */}
      <div className="flex-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Overview of your shared finances, activities, and balances.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onTriggerAction('create-expense')}>
          Add Expense
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid-3">
        {/* Net Balance Card */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `4px solid ${dashboardStats.netBalance >= 0 ? 'var(--color-blue)' : 'var(--color-red)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Net Balance</span>
            <Wallet size={18} style={{ color: dashboardStats.netBalance >= 0 ? 'var(--color-blue)' : 'var(--color-red)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: dashboardStats.netBalance >= 0 ? 'var(--text-primary)' : 'var(--color-red)' }}>
            {dashboardStats.netBalance >= 0 ? '+' : ''}${dashboardStats.netBalance.toFixed(2)}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            All groups and personal ledgers combined
          </span>
        </div>

        {/* To Receive Card */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--color-orange)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total to Receive</span>
            <ArrowUpRight size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ${dashboardStats.totalToReceive.toFixed(2)}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Lent money you are waiting for
          </span>
        </div>

        {/* To Pay Card */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--color-yellow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total to Pay</span>
            <ArrowDownLeft size={18} style={{ color: 'var(--color-yellow)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ${dashboardStats.totalToPay.toFixed(2)}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            Borrowed money you need to return
          </span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid-2">
        {/* Left Side: Quick Settlement & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Quick Settlement Card */}
          <div className="card glass" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
              Quick Settlements
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dashboardStats.myGroupDebts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  <CheckCircle2 size={32} style={{ color: 'var(--color-blue)', marginBottom: '8px' }} />
                  <div>All debts settled up! Nice work.</div>
                </div>
              ) : (
                dashboardStats.myGroupDebts.map((debt, idx) => {
                  const isIwe = debt.fromId === 'u-1';
                  return (
                    <div
                      key={idx}
                      className="flex-between"
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {isIwe ? `You owe ${getMemberName(debt.toId)}` : `${getMemberName(debt.fromId)} owes you`}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          {debt.groupName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: isIwe ? 'var(--color-red)' : 'var(--color-blue)' }}>
                          ${debt.amount.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleQuickSettle(debt.groupId)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px' }}
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="card glass">
            <div className="flex-between" style={{ marginBottom: '14px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
                Recent Activity
              </h3>
              <button 
                onClick={() => setView('ledger')} 
                style={{ border: 'none', background: 'none', color: 'var(--color-blue)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                View Ledgers <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activities.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  No recent activities recorded.
                </div>
              ) : (
                activities.slice(0, 4).map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <span
                      style={{
                        padding: '6px',
                        borderRadius: '50%',
                        backgroundColor:
                          activity.type === 'expense'
                            ? 'var(--color-blue-light)'
                            : activity.type === 'settlement'
                            ? 'var(--color-orange-light)'
                            : 'var(--bg-tertiary)',
                        color:
                          activity.type === 'expense'
                            ? 'var(--color-blue)'
                            : activity.type === 'settlement'
                            ? 'var(--color-orange)'
                            : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {activity.type === 'expense' ? '💸' : activity.type === 'settlement' ? '🤝' : '⚙️'}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{activity.title}</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activity.description}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {new Date(activity.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Visual Analytics Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Category Split Chart */}
          <div className="card glass">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
              Group Spending by Category
            </h3>
            
            {chartData.categoryTotals.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                <HelpCircle size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                <div>Add some expenses to see analytics!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                {/* SVG Donut Chart */}
                <div style={{ width: '160px', height: '160px', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--bg-primary)" strokeWidth="4"></circle>
                    {(() => {
                      let accumulatedPercentage = 0;
                      const colors = ['var(--color-blue)', 'var(--color-orange)', 'var(--color-yellow)', 'var(--color-red)', '#a855f7', '#06b6d4', '#10b981'];
                      
                      return chartData.categoryTotals.map((item, idx) => {
                        const pct = (item.value / chartData.totalSpent) * 100;
                        const strokeDasharray = `${pct} ${100 - pct}`;
                        const strokeDashoffset = 100 - accumulatedPercentage + 25; // 25 is rotation adjustment
                        accumulatedPercentage += pct;
                        
                        return (
                          <circle
                            key={idx}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="4.2"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          >
                            <title>{`${item.name}: $${item.value.toFixed(2)} (${pct.toFixed(1)}%)`}</title>
                          </circle>
                        );
                      });
                    })()}
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Spent</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>${chartData.totalSpent.toFixed(0)}</span>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, minWidth: '150px' }}>
                  {chartData.categoryTotals.map((item, idx) => {
                    const colors = ['var(--color-blue)', 'var(--color-orange)', 'var(--color-yellow)', 'var(--color-red)', '#a855f7', '#06b6d4', '#10b981'];
                    const pct = (item.value / chartData.totalSpent) * 100;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colors[idx % colors.length] }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>${item.value.toFixed(0)} ({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Spending Over Time Chart */}
          <div className="card glass">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '14px' }}>
              Spending Timeline
            </h3>
            {chartData.monthlySpending.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No spending data.
              </div>
            ) : (
              <div>
                <svg width="100%" height="120" viewBox="0 0 300 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="var(--border-color)" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="var(--border-color)" strokeWidth="0.5" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="var(--border-color)" strokeWidth="0.5" />
                  
                  {(() => {
                    const maxVal = Math.max(...chartData.monthlySpending.map(d => d.value), 1);
                    const coords = chartData.monthlySpending.map((d, idx) => {
                      const x = (idx / Math.max(chartData.monthlySpending.length - 1, 1)) * 300;
                      const y = 90 - (d.value / maxVal) * 80; // keep padding bottom/top
                      return { x, y, label: d.date, val: d.value };
                    });

                    // Build line path
                    const pathD = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                    // Build area path
                    const areaD = `${pathD} L ${coords[coords.length - 1].x} 90 L ${coords[0].x} 90 Z`;

                    return (
                      <>
                        <path d={areaD} fill="url(#gradient-blue)" opacity="0.15" />
                        <path d={pathD} fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" />
                        
                        {coords.map((c, idx) => (
                          <g key={idx}>
                            <circle cx={c.x} cy={c.y} r="3.5" fill="var(--color-blue)" stroke="var(--bg-secondary)" strokeWidth="1.5" />
                            <text x={c.x} y="98" fontSize="6" fill="var(--text-tertiary)" textAnchor="middle">
                              {c.label}
                            </text>
                          </g>
                        ))}

                        <defs>
                          <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-blue)" />
                            <stop offset="100%" stopColor="var(--color-blue)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
