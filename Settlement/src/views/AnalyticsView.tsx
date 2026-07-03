import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Award, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AnalyticsView: React.FC = () => {
  const { groups, members } = useApp();

  // Aggregate stats
  const stats = useMemo(() => {
    let totalSpent = 0;
    let expenseCount = 0;
    let maxExpenseAmount = 0;
    let maxExpenseTitle = 'None';
    
    const categoryTotals: Record<string, number> = {};
    const monthlySpending: Record<string, number> = {};
    const memberPaidTotals: Record<string, number> = {};

    groups.forEach((g) => {
      g.expenses.forEach((e) => {
        totalSpent += e.amount;
        expenseCount++;

        if (e.amount > maxExpenseAmount) {
          maxExpenseAmount = e.amount;
          maxExpenseTitle = `${e.title} (${g.name})`;
        }

        // Category breakdown
        const cat = e.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;

        // Date timeline
        const dateStr = e.date.substring(0, 7); // YYYY-MM
        monthlySpending[dateStr] = (monthlySpending[dateStr] || 0) + e.amount;

        // Paid by Member totals
        const payer = members.find((m) => m.id === e.paidById);
        if (payer) {
          memberPaidTotals[payer.name] = (memberPaidTotals[payer.name] || 0) + e.amount;
        }
      });
    });

    const averageExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

    // Find biggest spender
    let biggestSpenderName = 'None';
    let biggestSpenderAmount = 0;
    Object.entries(memberPaidTotals).forEach(([name, amount]) => {
      if (amount > biggestSpenderAmount) {
        biggestSpenderAmount = amount;
        biggestSpenderName = name;
      }
    });

    return {
      totalSpent,
      expenseCount,
      averageExpense,
      maxExpenseAmount,
      maxExpenseTitle,
      biggestSpenderName,
      biggestSpenderAmount,
      categoryTotals: Object.entries(categoryTotals).map(([name, value]) => ({ name, value })),
      monthlySpending: Object.entries(monthlySpending).map(([date, value]) => ({ date, value })).sort((a,b)=>a.date.localeCompare(b.date)),
      memberPaidTotals: Object.entries(memberPaidTotals).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value - a.value),
    };
  }, [groups, members]);

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
          Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Analyze spending distributions, payment trends, and top contributors across all groups.
        </p>
      </div>

      {stats.expenseCount === 0 ? (
        <div className="card glass flex-center" style={{ padding: '80px 20px', flexDirection: 'column', gap: '12px' }}>
          <HelpCircle size={48} style={{ color: 'var(--text-tertiary)', strokeWidth: 1.2 }} />
          <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No Analytics Available</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', maxWidth: '280px', textAlign: 'center' }}>
            Add expenses inside a group or scan receipts to unlock charts and statistics.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid-3">
            {/* Total Expense Card */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Group Spending</span>
                <DollarSign size={18} style={{ color: 'var(--color-blue)' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
                ${stats.totalSpent.toFixed(2)}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Across {stats.expenseCount} total logged expenses
              </span>
            </div>

            {/* Average Expense Card */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Average Expense Size</span>
                <TrendingUp size={18} style={{ color: 'var(--color-orange)' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
                ${stats.averageExpense.toFixed(2)}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Average amount per transaction
              </span>
            </div>

            {/* Biggest Spender Card */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Biggest Contributor</span>
                <Award size={18} style={{ color: 'var(--color-yellow)' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
                {stats.biggestSpenderName}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Paid a total of ${stats.biggestSpenderAmount.toFixed(0)} upfront
              </span>
            </div>
          </div>

          {/* Details Row 2 */}
          <div className="card glass" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.4rem' }}>📈</span>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Largest Single Expense:</span>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {stats.maxExpenseTitle} — <span style={{ color: 'var(--color-blue)' }}>${stats.maxExpenseAmount.toFixed(2)}</span>
              </h4>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid-2">
            {/* Category Split Chart */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
                Spending Category Breakdown
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                {/* SVG Donut Chart */}
                <div style={{ width: '150px', height: '150px', position: 'relative' }}>
                  <svg width="100%" height="100%" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--bg-primary)" strokeWidth="4"></circle>
                    {(() => {
                      let accumulatedPercentage = 0;
                      const colors = ['var(--color-blue)', 'var(--color-orange)', 'var(--color-yellow)', 'var(--color-red)', '#a855f7', '#06b6d4', '#10b981'];
                      
                      return stats.categoryTotals.map((item, idx) => {
                        const pct = (item.value / stats.totalSpent) * 100;
                        const strokeDasharray = `${pct} ${100 - pct}`;
                        const strokeDashoffset = 100 - accumulatedPercentage + 25; // rotation shift
                        accumulatedPercentage += pct;
                        
                        return (
                          <circle
                            key={idx}
                            cx="21"
                            cy="21"
                            r="15.915"
                            fill="transparent"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="4"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
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
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Spent</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>${stats.totalSpent.toFixed(0)}</span>
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, minWidth: '150px' }}>
                  {stats.categoryTotals.map((item, idx) => {
                    const colors = ['var(--color-blue)', 'var(--color-orange)', 'var(--color-yellow)', 'var(--color-red)', '#a855f7', '#06b6d4', '#10b981'];
                    const pct = (item.value / stats.totalSpent) * 100;
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
            </div>

            {/* Spender bar chart */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
                Payer Contributions (Upfront Paid)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
                {stats.memberPaidTotals.map((item, idx) => {
                  const maxPaid = Math.max(...stats.memberPaidTotals.map(d => d.value), 1);
                  const pct = (item.value / maxPaid) * 100;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 500 }}>{item.name}</span>
                        <span style={{ fontWeight: 700 }}>${item.value.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: 'var(--color-blue)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
              Spending Timeline History
            </h3>
            {stats.monthlySpending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No dates parsed.
              </div>
            ) : (
              <div>
                <svg width="100%" height="150" viewBox="0 0 500 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="var(--border-color)" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="500" y2="50" stroke="var(--border-color)" strokeWidth="0.5" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="var(--border-color)" strokeWidth="0.5" />

                  {(() => {
                    const maxVal = Math.max(...stats.monthlySpending.map(d => d.value), 1);
                    const coords = stats.monthlySpending.map((d, idx) => {
                      const x = (idx / Math.max(stats.monthlySpending.length - 1, 1)) * 460 + 20; // add horizontal padding
                      const y = 90 - (d.value / maxVal) * 70;
                      return { x, y, label: d.date, val: d.value };
                    });

                    // Build line path
                    const pathD = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                    // Build area path
                    const areaD = `${pathD} L ${coords[coords.length - 1].x} 90 L ${coords[0].x} 90 Z`;

                    return (
                      <>
                        <path d={areaD} fill="url(#gradient-blue-full)" opacity="0.15" />
                        <path d={pathD} fill="none" stroke="var(--color-blue)" strokeWidth="2.5" strokeLinecap="round" />
                        
                        {coords.map((c, idx) => (
                          <g key={idx}>
                            <circle cx={c.x} cy={c.y} r="4" fill="var(--color-blue)" stroke="var(--bg-secondary)" strokeWidth="2" />
                            <text x={c.x} y="98" fontSize="6.5" fill="var(--text-secondary)" textAnchor="middle" fontWeight="bold">
                              {c.label} (${c.val.toFixed(0)})
                            </text>
                          </g>
                        ))}

                        <defs>
                          <linearGradient id="gradient-blue-full" x1="0" y1="0" x2="0" y2="1">
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
        </>
      )}
    </div>
  );
};
