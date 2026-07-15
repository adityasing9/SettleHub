import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Save, Trash2, Plus, Info } from "lucide-react";

interface Member {
  id: string;
  name: string;
  color: string;
}

interface SpreadsheetViewProps {
  groupId: string;
  groupCurrency: string;
  members: Member[];
  transactions: any[];
  onRefresh: () => void;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  groupId,
  groupCurrency,
  members,
  transactions,
  onRefresh,
}) => {
  const { apiFetch } = useAuth();
  
  // Grid rows local state
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

  // Initialize spreadsheet rows from transactions database
  useEffect(() => {
    const formatted = transactions.map((t) => {
      // Map participants calculations
      const participantShares = members.map((m) => {
        const p = t.participants.find((part: any) => part.memberId === m.id);
        return {
          memberId: m.id,
          included: !!p,
          shareValue: p ? Number(p.shareValue) : 0,
          calculatedOwe: p ? Number(p.calculatedOwe) : 0,
        };
      });

      return {
        id: t.id,
        itemName: t.itemName,
        amount: Number(t.amount),
        payerId: t.payerId,
        splitType: t.splitType,
        category: t.category,
        shares: participantShares,
        isNew: false,
      };
    });

    setRows(formatted);
  }, [transactions, members]);

  // Insert a new blank draft row
  const addNewRow = () => {
    const defaultShares = members.map((m) => ({
      memberId: m.id,
      included: true,
      shareValue: 1, // Default share weigh
      calculatedOwe: 0,
    }));

    const newRow = {
      id: `new-${Date.now()}`,
      itemName: "",
      amount: 0,
      payerId: members[0]?.id || "",
      splitType: "EQUAL",
      category: "General",
      shares: defaultShares,
      isNew: true,
    };

    setRows((prev) => [...prev, newRow]);
  };

  // Recalculates split values for a specific row
  const runRowRecalculation = (row: any) => {
    const amt = Number(row.amount);
    const split = row.splitType;
    const activeShares = row.shares;

    // Filter included members
    const included = activeShares.filter((s: any) => s.included);
    const n = included.length;

    if (n === 0) {
      activeShares.forEach((s: any) => (s.calculatedOwe = 0));
      return { ...row, shares: activeShares };
    }

    let totalCalculated = 0;

    if (split === "EQUAL") {
      const share = Math.round((amt / n) * 100) / 100;
      activeShares.forEach((s: any) => {
        if (s.included) {
          s.calculatedOwe = share;
          totalCalculated += share;
        } else {
          s.calculatedOwe = 0;
        }
      });
      // Adjust rounding error
      const diff = Math.round((amt - totalCalculated) * 100) / 100;
      if (Math.abs(diff) > 0.001) {
        const first = activeShares.find((s: any) => s.included);
        if (first) first.calculatedOwe = Math.round((first.calculatedOwe + diff) * 100) / 100;
      }
    } 
    else if (split === "PERCENTAGE") {
      activeShares.forEach((s: any) => {
        if (s.included) {
          const share = Math.round((amt * (s.shareValue / 100)) * 100) / 100;
          s.calculatedOwe = share;
          totalCalculated += share;
        } else {
          s.calculatedOwe = 0;
        }
      });
      // Adjust rounding error
      const diff = Math.round((amt - totalCalculated) * 100) / 100;
      if (Math.abs(diff) > 0.001) {
        const first = activeShares.find((s: any) => s.included);
        if (first) first.calculatedOwe = Math.round((first.calculatedOwe + diff) * 100) / 100;
      }
    } 
    else if (split === "EXACT" || split === "CUSTOM") {
      activeShares.forEach((s: any) => {
        if (s.included) {
          s.calculatedOwe = Number(s.shareValue);
        } else {
          s.calculatedOwe = 0;
        }
      });
    } 
    else if (split === "WEIGHTED" || split === "SHARES") {
      const totalWeight = included.reduce((sum: number, s: any) => sum + Number(s.shareValue), 0);
      if (totalWeight > 0) {
        activeShares.forEach((s: any) => {
          if (s.included) {
            const share = Math.round((amt * (Number(s.shareValue) / totalWeight)) * 100) / 100;
            s.calculatedOwe = share;
            totalCalculated += share;
          } else {
            s.calculatedOwe = 0;
          }
        });
        const diff = Math.round((amt - totalCalculated) * 100) / 100;
        if (Math.abs(diff) > 0.001) {
          const first = activeShares.find((s: any) => s.included);
          if (first) first.calculatedOwe = Math.round((first.calculatedOwe + diff) * 100) / 100;
        }
      }
    }

    return { ...row, shares: activeShares };
  };

  // Handle value change inside grid cells
  const handleCellChange = (rowId: string, field: string, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const updated = { ...r, [field]: value };
          return runRowRecalculation(updated);
        }
        return r;
      })
    );
  };

  // Handle member checkbox inclusion toggle
  const handleInclusionToggle = (rowId: string, memberId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const updatedShares = r.shares.map((s: any) => {
            if (s.memberId === memberId) {
              const newIncluded = !s.included;
              return {
                ...s,
                included: newIncluded,
                // reset share value if excluded
                shareValue: newIncluded ? (r.splitType === "PERCENTAGE" ? 100 / r.shares.length : 1) : 0,
              };
            }
            return s;
          });
          const updated = { ...r, shares: updatedShares };
          return runRowRecalculation(updated);
        }
        return r;
      })
    );
  };

  // Handle numerical share/percentage input change
  const handleShareValueChange = (rowId: string, memberId: string, val: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const updatedShares = r.shares.map((s: any) => {
            if (s.memberId === memberId) {
              return { ...s, shareValue: val };
            }
            return s;
          });
          const updated = { ...r, shares: updatedShares };
          return runRowRecalculation(updated);
        }
        return r;
      })
    );
  };

  // Save changes to database API
  const handleSaveRow = async (row: any) => {
    if (!row.itemName.trim()) {
      alert("Please enter a transaction item name.");
      return;
    }
    if (row.amount <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }

    setLoadingRowId(row.id);

    // Format participants payload
    const participantsPayload = row.shares
      .filter((s: any) => s.included)
      .map((s: any) => ({
        memberId: s.memberId,
        shareValue: Number(s.shareValue),
      }));

    try {
      const url = row.isNew
        ? `/groups/${groupId}/transactions`
        : `/groups/${groupId}/transactions/${row.id}`;
      const method = row.isNew ? "POST" : "PUT";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          itemName: row.itemName,
          amount: Number(row.amount),
          payerId: row.payerId,
          splitType: row.splitType,
          category: row.category,
          participants: participantsPayload,
        }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save expense row");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to communicate with the server. Action queued for sync.");
      onRefresh();
    } finally {
      setLoadingRowId(null);
    }
  };

  // Delete transaction from database API
  const handleDeleteRow = async (rowId: string, isNew: boolean) => {
    if (isNew) {
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      return;
    }

    if (!confirm("Are you sure you want to delete this transaction?")) return;

    setLoadingRowId(rowId);
    try {
      const res = await apiFetch(`/groups/${groupId}/transactions/${rowId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete expense");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete transaction. Action queued offline.");
      onRefresh();
    } finally {
      setLoadingRowId(null);
    }
  };

  // Calculate Column Totals for the bottom row
  const getColTotal = (memberId: string) => {
    return rows.reduce((sum, r) => {
      const share = r.shares.find((s: any) => s.memberId === memberId);
      return sum + (share ? Number(share.calculatedOwe) : 0);
    }, 0);
  };

  const getPayerTotalPaid = (memberId: string) => {
    return rows.reduce((sum, r) => {
      return sum + (r.payerId === memberId ? Number(r.amount) : 0);
    }, 0);
  };

  const grandTotalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Help Banner */}
      <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-400">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Excel Spreadsheet View:</strong> Edit cells directly in the table below. Toggling checkboxes 
          automatically recalulates shares. Click the <strong>Save</strong> button on the row to persist updates in the database.
        </p>
      </div>

      <div className="flex justify-between items-center px-1">
        <span className="text-xs text-gray-500 font-semibold uppercase">
          Transactions Grid ({rows.length} rows)
        </span>
        <button
          onClick={addNewRow}
          className="flex items-center gap-1 bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-1.5 px-3 rounded-lg cursor-pointer transition-colors shadow-md"
        >
          <Plus size={13} />
          Add Blank Row
        </button>
      </div>

      {/* Spreadsheet grid */}
      <div className="spreadsheet-container rounded-xl border border-white/5 bg-card">
        <table className="spreadsheet-table min-w-full">
          <thead>
            <tr>
              <th className="spreadsheet-th sticky-col-item">Item Name</th>
              <th className="spreadsheet-th sticky-col-payer">Paid By</th>
              <th className="spreadsheet-th sticky-col-amount">Amount</th>
              <th className="spreadsheet-th text-center">Split Type</th>
              {members.map((m) => (
                <th key={m.id} className="spreadsheet-th text-center" style={{ borderTop: `2px solid ${m.color}` }}>
                  {m.name}
                </th>
              ))}
              <th className="spreadsheet-th text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="spreadsheet-tr">
                {/* Item Name */}
                <td className="spreadsheet-td sticky-col-item">
                  <input
                    type="text"
                    value={row.itemName}
                    onChange={(e) => handleCellChange(row.id, "itemName", e.target.value)}
                    placeholder="Enter item..."
                    className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-1 text-white placeholder-gray-600"
                  />
                </td>

                {/* Payer Selector */}
                <td className="spreadsheet-td sticky-col-payer">
                  <select
                    value={row.payerId}
                    onChange={(e) => handleCellChange(row.id, "payerId", e.target.value)}
                    className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-1 text-white cursor-pointer"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id} className="bg-card text-white">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Amount Input */}
                <td className="spreadsheet-td sticky-col-amount">
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-1">{groupCurrency === "INR" ? "₹" : "$"}</span>
                    <input
                      type="number"
                      value={row.amount || ""}
                      onChange={(e) => handleCellChange(row.id, "amount", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-1 text-white font-mono text-sm"
                    />
                  </div>
                </td>

                {/* Split Type Selector */}
                <td className="spreadsheet-td text-center">
                  <select
                    value={row.splitType}
                    onChange={(e) => handleCellChange(row.id, "splitType", e.target.value)}
                    className="bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-1 text-xs text-gray-300 font-semibold cursor-pointer"
                  >
                    <option value="EQUAL" className="bg-card">Equal (=)</option>
                    <option value="PERCENTAGE" className="bg-card">Percent (%)</option>
                    <option value="EXACT" className="bg-card">Exact (₹)</option>
                    <option value="WEIGHTED" className="bg-card">Weight (w)</option>
                    <option value="SHARES" className="bg-card">Shares (s)</option>
                  </select>
                </td>

                {/* Member split columns */}
                {row.shares.map((share: any) => {
                  const memberColor = members.find((m) => m.id === share.memberId)?.color || "#fff";
                  return (
                    <td key={share.memberId} className="spreadsheet-td text-center align-middle min-w-[100px]">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {/* Included Checkbox */}
                        <input
                          type="checkbox"
                          checked={share.included}
                          onChange={() => handleInclusionToggle(row.id, share.memberId)}
                          style={{ accentColor: memberColor }}
                          className="h-4 w-4 cursor-pointer rounded border-white/10"
                        />

                        {/* Numeric input depending on split type */}
                        {share.included && row.splitType !== "EQUAL" && (
                          <input
                            type="number"
                            value={share.shareValue || ""}
                            onChange={(e) =>
                              handleShareValueChange(row.id, share.memberId, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 text-center text-xs bg-white/5 border border-white/10 rounded py-0.5 text-white font-mono"
                          />
                        )}

                        {/* Calculated cash amount owed display */}
                        {share.included ? (
                          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {groupCurrency === "INR" ? "₹" : "$"}{Number(share.calculatedOwe).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-500 font-bold mt-0.5">✖</span>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Action buttons */}
                <td className="spreadsheet-td text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleSaveRow(row)}
                      disabled={loadingRowId === row.id}
                      className={`p-1.5 rounded bg-primary/20 hover:bg-primary/40 text-primary cursor-pointer transition-colors ${
                        loadingRowId === row.id ? "animate-pulse" : ""
                      }`}
                      title="Save Row"
                    >
                      <Save size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteRow(row.id, row.isNew)}
                      disabled={loadingRowId === row.id}
                      className="p-1.5 rounded bg-danger/20 hover:bg-danger/40 text-danger cursor-pointer transition-colors"
                      title="Delete Row"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Column Summary Row */}
            <tr className="border-t-2 border-white/10 bg-secondary/30">
              <td className="spreadsheet-td sticky-col-item font-bold text-xs text-gray-400">Ledger Totals</td>
              <td className="spreadsheet-td sticky-col-payer text-[10px] text-gray-500">Aggregated Net sum</td>
              <td className="spreadsheet-td sticky-col-amount font-bold text-sm font-mono text-white">
                {groupCurrency === "INR" ? "₹" : "$"}{grandTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="spreadsheet-td"></td>
              {members.map((m) => {
                const totalOwed = getColTotal(m.id);
                const totalPaid = getPayerTotalPaid(m.id);
                const bal = totalPaid - totalOwed;

                return (
                  <td key={m.id} className="spreadsheet-td text-center">
                    <div className="flex flex-col gap-0.5 font-mono text-xs">
                      <span className="text-gray-400 font-semibold" title="Total Spent as Payer">
                        Paid: {groupCurrency === "INR" ? "₹" : "$"}{totalPaid.toFixed(0)}
                      </span>
                      <span className="text-gray-500" title="Total Owed as Share">
                        Owes: {groupCurrency === "INR" ? "₹" : "$"}{totalOwed.toFixed(0)}
                      </span>
                      <span
                        className={`font-bold mt-1 ${bal >= 0 ? "text-success" : "text-danger"}`}
                        title="Net Balance"
                      >
                        Bal: {bal >= 0 ? "+" : ""}{bal.toFixed(0)}
                      </span>
                    </div>
                  </td>
                );
              })}
              <td className="spreadsheet-td"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
