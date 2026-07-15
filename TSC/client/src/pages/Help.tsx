import React from "react";
import { Layout, CheckSquare, Sparkles, RefreshCw } from "lucide-react";

export const Help: React.FC = () => {
  return (
    <div className="p-6 flex flex-col gap-6 pb-24 md:pb-6 select-none max-w-3xl mx-auto leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Help & Documentation
        </h1>
        <p className="text-xs text-gray-400 mt-1">Learn how to interact with spreadsheet ledgers and simplify debts.</p>
      </div>

      <div className="flex flex-col gap-6 text-xs text-gray-300">
        {/* Section 1: Spreadsheet */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Layout size={16} className="text-primary" />
            Excel-Style Ledger View
          </h3>
          <p>
            The central spreadsheet allows inline cell modification similar to Microsoft Excel.
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1.5">
            <li>
              <strong>Item Name & Payer:</strong> Click inside the text box or dropdown to change item description and payers.
            </li>
            <li>
              <strong>Total Amount:</strong> Modifying the amount recalculates row splits dynamically.
            </li>
            <li>
              <strong>Split Columns:</strong> Each roommate has a dedicated column with a checkbox representing their inclusion in that expense split.
            </li>
            <li>
              <strong>Instant Updates:</strong> Toggle checkboxes to add/exclude members, or change custom share values. The row cells and bottom totals update instantly.
            </li>
            <li>
              <strong>Save / Delete:</strong> Always click the <strong>Save (Disk)</strong> icon at the end of the row to record your edits in the system!
            </li>
          </ul>
        </div>

        {/* Section 2: Splitting Methods */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <CheckSquare size={16} className="text-success" />
            Advanced Sharing Schemes
          </h3>
          <p>
            Select from the <strong>Split Type</strong> dropdown inside the spreadsheet row to toggle sharing modes:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="p-3 bg-secondary/30 rounded-xl border border-white/5">
              <h4 className="font-bold text-white mb-1">Equal Split (=)</h4>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Apportions expense evenly among all checked members. Rounding pennies are adjusted automatically.
              </p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-xl border border-white/5">
              <h4 className="font-bold text-white mb-1">Percentage Split (%)</h4>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Requires specifying exact percentage share allocations per member. Allocations must sum to 100%.
              </p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-xl border border-white/5">
              <h4 className="font-bold text-white mb-1">Exact Amount Split (₹)</h4>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Specifies exact currency balances for each member. The sum of shares must equal the total amount.
              </p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-xl border border-white/5">
              <h4 className="font-bold text-white mb-1">Weighted Split (w)</h4>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Assigns custom numbers (like ratios or weights) to member shares. Split is calculated proportionally.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: AI chatbot & OCR */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Sparkles size={16} className="text-primary" />
            AI Insights & Chat Assistant
          </h3>
          <p>
            Under the <strong>AI Insights</strong> tab on group detail views, you can converse with the SmartSplit assistant:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
            <li>Type queries like: <em>"Who spent the most?"</em> to check group top spender.</li>
            <li>Type queries like: <em>"How much do I owe?"</em> to fetch outstanding debt balances.</li>
            <li>Type queries like: <em>"Show rent expenses"</em> to instantly filter group transactions.</li>
          </ul>
        </div>

        {/* Section 4: Offline PWA Caching */}
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
            <RefreshCw size={16} className="text-amber-500" />
            PWA Offline Capability
          </h3>
          <p>
            SmartSplit is a Progressive Web Application. If connection is lost:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
            <li>You can continue browsing dashboard stats, groups, and spreadsheets.</li>
            <li>Any expenses saved offline are automatically queued in IndexedDB.</li>
            <li>The system will auto-sync and upload your writes once network connectivity returns!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
