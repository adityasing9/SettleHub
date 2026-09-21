import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';
import { formatDateTime } from './formatters';

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  transactions?: Transaction[];
}

export interface ExpenseReportPDFData {
  dateRangeLabel: string;
  categoryFilterLabel: string;
  paymentModeFilterLabel: string;
  totalAmount: number;
  transactionCount: number;
  dailyAverage: number;
  topCategory: { name: string; amount: number } | null;
  categoryBreakdown: CategoryBreakdownItem[];
  transactions: Transaction[];
}

function formatPdfCurrency(amount: number): string {
  const rounded = Math.abs(Math.round(amount * 100) / 100);
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(rounded);
  const prefix = amount < 0 ? '-Rs. ' : 'Rs. ';
  return `${prefix}${formattedNumber}`;
}

export function generateAndSaveExpensePDF(data: ExpenseReportPDFData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Banner
  doc.setFillColor(67, 56, 202); // Indigo-700
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SettleMate - Personal Expense Report', margin, 12);

  // Subtitle / App Tagline
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Local & Private Personal Finance Manager', margin, 18);

  // Generated Date on right
  const nowStr = formatDateTime(new Date().toISOString());
  doc.setFontSize(8);
  doc.text(`Generated: ${nowStr}`, pageWidth - margin, 18, { align: 'right' });

  let currentY = 35;

  // Metadata / Filters Box
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 17, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT PERIOD:', margin + 4, currentY + 5.5);
  doc.text('CATEGORY FILTER:', margin + 65, currentY + 5.5);
  doc.text('PAYMENT METHOD:', margin + 125, currentY + 5.5);

  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFontSize(8.5);
  doc.text(data.dateRangeLabel, margin + 4, currentY + 11.5);
  doc.text(data.categoryFilterLabel, margin + 65, currentY + 11.5);
  doc.text(data.paymentModeFilterLabel, margin + 125, currentY + 11.5);

  currentY += 23;

  // Summary Metrics Table
  const topCatText = data.topCategory
    ? `${data.topCategory.name} (${formatPdfCurrency(data.topCategory.amount)})`
    : 'None';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['Total Expenses', 'Transactions', 'Daily Average', 'Top Category']],
    body: [
      [
        formatPdfCurrency(data.totalAmount),
        data.transactionCount.toString(),
        formatPdfCurrency(data.dailyAverage),
        topCatText
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9.5,
      fontStyle: 'bold',
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 3.5
    },
    columnStyles: {
      0: { textColor: [109, 40, 217] }, // Purple-700
      1: { textColor: [67, 56, 202] }, // Indigo-700
      2: { textColor: [29, 78, 216] }, // Blue-700
      3: { textColor: [15, 23, 42], fontSize: 8.5 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Category Summary Section
  if (data.categoryBreakdown.length > 0) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Summary Breakdown', margin, currentY);
    currentY += 3;

    const catSummaryRows = data.categoryBreakdown.map(c => [
      c.category,
      formatPdfCurrency(c.amount),
      `${c.percentage.toFixed(1)}%`,
      c.count.toString()
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Category', 'Amount', '% of Total', 'Count']],
      body: catSummaryRows,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229], // Indigo-600
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
        cellPadding: 2
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold' },
        2: { halign: 'right' },
        3: { halign: 'center' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page for itemized section
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 16;
  }

  // Itemized Expenses by Category
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Itemized Expenses by Category', margin, currentY);
  currentY += 4;

  if (data.categoryBreakdown.length === 0 || data.transactions.length === 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Date & Time', 'Description', 'Payment Mode', 'Amount']],
      body: [['-', '-', 'No expenses recorded in this period', '-', '-']],
      theme: 'plain',
      styles: { fontSize: 8, textColor: [100, 116, 139], halign: 'center' }
    });
  } else {
    // Iterate through each category and list its itemized expenses
    for (const cat of data.categoryBreakdown) {
      const items = cat.transactions || [];
      if (items.length === 0) continue;

      // Check space for category header + at least 2 table rows
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 16;
      }

      // Category Subheader Box
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text(`${cat.category}  (${cat.count} ${cat.count === 1 ? 'expense' : 'expenses'})`, margin + 3, currentY + 4.8);

      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text(
        `Subtotal: ${formatPdfCurrency(cat.amount)}  (${cat.percentage.toFixed(1)}%)`,
        pageWidth - margin - 3,
        currentY + 4.8,
        { align: 'right' }
      );
      currentY += 8;

      const txRows = items.map((t, idx) => [
        (idx + 1).toString(),
        formatDateTime(t.date),
        t.description || 'Expense',
        t.paymentMode || 'Other',
        formatPdfCurrency(t.amount)
      ]);

      // Category Items Table
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['#', 'Date & Time', 'Description', 'Payment Mode', 'Amount']],
        body: txRows,
        foot: [['', '', `Subtotal for ${cat.category}`, '', formatPdfCurrency(cat.amount)]],
        theme: 'striped',
        headStyles: {
          fillColor: [51, 65, 85], // Slate-700
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85],
          cellPadding: 2
        },
        footStyles: {
          fillColor: [248, 250, 252],
          textColor: [30, 41, 59],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 38 },
          2: { fontStyle: 'normal' },
          3: { cellWidth: 26 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 28, textColor: [15, 23, 42] }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Grand Total Banner at the bottom
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFillColor(67, 56, 202); // Indigo-700
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`GRAND TOTAL (${data.transactionCount} Total Expenses):`, margin + 4, currentY + 6.5);
    doc.text(formatPdfCurrency(data.totalAmount), pageWidth - margin - 4, currentY + 6.5, { align: 'right' });
  }

  // Add Footers to all pages
  const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(
      'SettleMate • Local-First Personal Expense Manager',
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  // Save the PDF directly to device
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `SettleMate_Expense_Report_${dateStamp}.pdf`;
  doc.save(fileName);
}
