import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface OcrScannerViewProps {
  setView: (view: string) => void;
  setSelectedGroupId: (id: string | null) => void;
}

interface DemoReceipt {
  name: string;
  merchant: string;
  amount: number;
  date: string;
  tax: number;
  items: { description: string; amount: number }[];
  fileText: string;
}

const DEMO_RECEIPTS: DemoReceipt[] = [
  {
    name: '☕ Starbucks Cafe',
    merchant: 'Starbucks Coffee #241',
    amount: 15.75,
    date: '2026-07-02',
    tax: 1.25,
    items: [
      { description: 'Caramel Macchiato Venti', amount: 6.50 },
      { description: 'Avocado Sourdough Toast', amount: 8.00 }
    ],
    fileText: 'STARBUCKS COFFEE\nStore #241 - Bangalore\n\nDate: 02/07/2026 09:12 AM\n------------------------\n1x Caramel Macchiato    $6.50\n1x Avocado Toast        $8.00\n------------------------\nSubtotal:              $14.50\nTax (Sales 8.6%):       $1.25\nTOTAL:                 $15.75\n------------------------\nThank you for your visit!'
  },
  {
    name: '🍽️ Goa Seafood Dinner',
    merchant: "Fisherman's Wharf Goa",
    amount: 180.00,
    date: '2026-07-01',
    tax: 20.00,
    items: [
      { description: 'Kingfish Rawa Fry', amount: 45.00 },
      { description: 'Seafood Rice Platter', amount: 75.00 },
      { description: 'Cocktails & Brews', amount: 40.00 }
    ],
    fileText: 'THE FISHERMANS WHARF\nCavelossim, Goa, IN\n\nDate: 01/07/2026 09:30 PM\nTable: 24  Server: Rohan\n------------------------\n1x Kingfish Rawa Fry   $45.00\n1x Seafood Platter     $75.00\n3x Craft Beer / Drinks $40.00\n------------------------\nSubtotal:             $160.00\nSGST/CGST Tax:         $20.00\nTOTAL AMOUNT:         $180.00\n------------------------\nNo Tips Included. Service Charge 5%.'
  },
  {
    name: '🚗 Uber Airport Ride',
    merchant: 'Uber Ride Services',
    amount: 45.20,
    date: '2026-06-30',
    tax: 3.50,
    items: [
      { description: 'Uber XL Airport Trip', amount: 37.70 },
      { description: 'Highway Toll Fee', amount: 4.00 }
    ],
    fileText: 'UBER TECHNOLOGIES INC\nE-Receipt for Ride\n\nDate: 30/06/2026 06:15 AM\nTrip ID: 9481bfa-84d\n------------------------\nBase Fare Uber XL:     $37.70\nAirport Toll Fee:       $4.00\nBooking Fee & Tax:      $3.50\n------------------------\nPAID IN FULL (VISA):   $45.20\n------------------------\nHope you enjoyed your ride!'
  }
];

export const OcrScannerView: React.FC<OcrScannerViewProps> = ({ setView, setSelectedGroupId }) => {
  const { groups, addExpense } = useApp();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [receiptData, setReceiptData] = useState<DemoReceipt | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Form states for creating expense from OCR
  const [targetGroupId, setTargetGroupId] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [paidById, setPaidById] = useState('u-1'); // Default to you

  const startScanSimulation = (receipt: DemoReceipt) => {
    setScanning(true);
    setReceiptData(null);
    setSelectedFile(new File([''], 'receipt.jpg', { type: 'image/jpeg' }));

    setTimeout(() => {
      setScanning(false);
      setReceiptData(receipt);
      // Pre-fill form fields
      setExpenseTitle(receipt.merchant);
      setExpenseAmount(receipt.amount);
      setExpenseDate(receipt.date);
      setExpenseNotes(`Extracted via SettleHub AI OCR. Items:\n${receipt.items.map(i => `- ${i.description}: $${i.amount}`).join('\n')}`);
      
      // Auto-assign category
      if (receipt.merchant.toLowerCase().includes('uber')) {
        setExpenseCategory('Transport');
      } else if (receipt.merchant.toLowerCase().includes('starbucks') || receipt.merchant.toLowerCase().includes('wharf')) {
        setExpenseCategory('Food');
      } else {
        setExpenseCategory('Other');
      }

      if (groups.length > 0) {
        setTargetGroupId(groups[0].id);
      }
    }, 2500);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Choose a random demo receipt to simulate upload parsing
      const randomDemo = DEMO_RECEIPTS[Math.floor(Math.random() * DEMO_RECEIPTS.length)];
      startScanSimulation(randomDemo);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const randomDemo = DEMO_RECEIPTS[Math.floor(Math.random() * DEMO_RECEIPTS.length)];
      startScanSimulation(randomDemo);
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGroupId) return;

    const group = groups.find((g) => g.id === targetGroupId);
    if (!group) return;

    // Create an equal split among all group members by default for simple logs
    const memberIds = group.members.map((m) => m.id);

    addExpense(targetGroupId, {
      title: expenseTitle,
      amount: expenseAmount,
      paidById: paidById,
      participants: memberIds,
      splitType: 'equal',
      splits: {},
      category: expenseCategory,
      date: expenseDate,
      notes: expenseNotes,
      receiptData: {
        merchant: receiptData?.merchant,
        tax: receiptData?.tax,
        items: receiptData?.items,
      }
    });

    // Reset scanner view and redirect
    setSelectedFile(null);
    setReceiptData(null);
    setSelectedGroupId(targetGroupId);
    setView('groups');
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
          AI OCR Receipt Scanner
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Upload/drag receipt images. Our AI-driven OCR parses merchants, subtotals, taxes, and items automatically.
        </p>
      </div>

      <div className="grid-2">
        {/* Left Side: Upload & Scan Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* File Upload Zone */}
          <div
            className={`card glass ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              backgroundColor: dragActive ? 'var(--color-blue-light)' : 'var(--bg-secondary)',
              borderColor: dragActive ? 'var(--color-blue)' : 'var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <input
              type="file"
              id="receipt-file-input"
              multiple={false}
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="receipt-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-blue)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <Upload size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Drag & Drop Receipt</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Supports JPEG, PNG, or PDF files. Up to 10MB.
                </p>
              </div>
            </label>
          </div>

          {/* Quick Demo Templates */}
          <div className="card glass">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: '12px' }}>
              Try a Preloaded Demo Receipt
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              No image? Click one of these sample bills to experience the scanning speed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEMO_RECEIPTS.map((receipt, idx) => (
                <button
                  key={idx}
                  onClick={() => startScanSimulation(receipt)}
                  className="btn btn-secondary"
                  disabled={scanning}
                  style={{
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    fontSize: '0.85rem',
                    textAlign: 'left'
                  }}
                >
                  <span>{receipt.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    ${receipt.amount.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Scan Status & Result Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Scan Animation Box */}
          {scanning && (
            <div
              className="card glass flex-center"
              style={{
                height: '350px',
                flexDirection: 'column',
                gap: '20px',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--color-blue)'
              }}
            >
              {/* Animated scanning laser */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: 'var(--color-blue)',
                  boxShadow: '0 0 15px 4px var(--color-blue)',
                  animation: 'laserScan 2.5s infinite linear',
                  zIndex: 2,
                }}
              />
              <RefreshCw size={40} className="spin text-secondary" style={{ animation: 'spin-anim 1.5s linear infinite', color: 'var(--color-blue)' }} />
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>Extracting Bill Details</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  OCR Model: GPT-Receipt-Extractor v4.0. Running OCR OCR...
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!scanning && !receiptData && (
            <div
              className="card glass flex-center"
              style={{
                height: '350px',
                flexDirection: 'column',
                gap: '12px',
                color: 'var(--text-tertiary)',
                textAlign: 'center',
              }}
            >
              <FileText size={48} style={{ strokeWidth: 1 }} />
              <div>
                <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Ready for Upload</h4>
                <p style={{ fontSize: '0.8rem', maxWidth: '280px', margin: '4px auto 0' }}>
                  Drag in files or tap a demo template to pre-fill the settlement logs.
                </p>
              </div>
            </div>
          )}

          {/* Extracted Form & Details */}
          {!scanning && receiptData && (
            <div className="card glass animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Receipt Preview text */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    width: '50%',
                    flexGrow: 1,
                  }}
                >
                  {receiptData.fileText}
                </div>

                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="badge badge-blue" style={{ alignSelf: 'flex-start' }}>
                    <CheckCircle size={12} /> OCR Extracted {selectedFile ? `(${selectedFile.name})` : ''}
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{receiptData.merchant}</h4>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                    <span>Date: {receiptData.date}</span>
                    <span>Tax Amount: ${receiptData.tax.toFixed(2)}</span>
                    <span style={{ marginTop: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>Line Items:</span>
                    {receiptData.items.map((it, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem' }}>
                        • {it.description} (${it.amount.toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Form */}
              <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Log to Group</h3>
                
                {groups.length === 0 ? (
                  <div className="badge badge-red" style={{ padding: '8px 12px' }}>
                    <AlertTriangle size={14} /> You must create a group first to add expenses!
                  </div>
                ) : (
                  <>
                    <div className="grid-2">
                      <div>
                        <label>Target Group</label>
                        <select
                          value={targetGroupId}
                          onChange={(e) => setTargetGroupId(e.target.value)}
                          required
                        >
                          <option value="">Select Group...</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Paid By</label>
                        <select
                          value={paidById}
                          onChange={(e) => setPaidById(e.target.value)}
                        >
                          <option value="u-1">Aadi (You)</option>
                          {targetGroupId &&
                            groups
                              .find((g) => g.id === targetGroupId)
                              ?.members.filter((m) => m.id !== 'u-1')
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div>
                        <label>Expense Title</label>
                        <input
                          type="text"
                          value={expenseTitle}
                          onChange={(e) => setExpenseTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label>Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid-2">
                      <div>
                        <label>Date</label>
                        <input
                          type="date"
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label>Category</label>
                        <select
                          value={expenseCategory}
                          onChange={(e) => setExpenseCategory(e.target.value)}
                        >
                          <option value="Food">Food</option>
                          <option value="Accommodation">Accommodation</option>
                          <option value="Transport">Transport</option>
                          <option value="Groceries">Groceries</option>
                          <option value="Rent">Rent</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label>Notes & Extracted Items</label>
                      <textarea
                        rows={3}
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedFile(null);
                          setReceiptData(null);
                        }}
                      >
                        Reset
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Log Expense <ArrowRight size={14} />
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .drag-active {
          background-color: var(--color-blue-light) !important;
          border-color: var(--color-blue) !important;
        }
      `}</style>
    </div>
  );
};
