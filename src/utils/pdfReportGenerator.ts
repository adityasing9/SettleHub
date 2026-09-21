import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';
import { formatDateTime } from './formatters';

export interface ExpenseReportPDFData {
  dateRangeLabel: string;
  categoryFilterLabel: string;
  paymentModeFilterLabel: string;
  totalAmount: number;
  transactionCount: number;
  dailyAverage: number;
  topCategory: { name: string; amount: number } | null;
  categoryBreakdown: { category: string; amount: number; percentage: number; count: number }[];
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

  let currentY = 36;

  // Metadata / Filters Box
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT PERIOD:', margin + 4, currentY + 6);
  doc.text('CATEGORY FILTER:', margin + 65, currentY + 6);
  doc.text('PAYMENT METHOD:', margin + 125, currentY + 6);

  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFontSize(9);
  doc.text(data.dateRangeLabel, margin + 4, currentY + 12);
  doc.text(data.categoryFilterLabel, margin + 65, currentY + 12);
  doc.text(data.paymentModeFilterLabel, margin + 125, currentY + 12);

  currentY += 24;

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
      fontSize: 10,
      fontStyle: 'bold',
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 4
    },
    columnStyles: {
      0: { textColor: [109, 40, 217] }, // Purple-700
      1: { textColor: [67, 56, 202] }, // Indigo-700
      2: { textColor: [29, 78, 216] }, // Blue-700
      3: { textColor: [15, 23, 42], fontSize: 8.5 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Category Breakdown Section
  if (data.categoryBreakdown.length > 0) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Spending by Category', margin, currentY);
    currentY += 3;

    const catRows = data.categoryBreakdown.map(c => [
      c.category,
      formatPdfCurrency(c.amount),
      `${c.percentage.toFixed(1)}%`,
      c.count.toString()
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Category', 'Amount', '% of Total', 'Count']],
      body: catRows,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229], // Indigo-600
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85],
        cellPadding: 2.5
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold' },
        2: { halign: 'right' },
        3: { halign: 'center' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Check if we need a new page for transactions table
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 16;
  }

  // Detailed Transactions Section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Transaction Details (${data.transactions.length})`, margin, currentY);
  currentY += 3;

  const txRows = data.transactions.map((t, idx) => {
    const cat = t.category || (t.type === 'SETTLEMENT' ? 'Friend Repayment' : 'General');
    const payment = t.paymentMode || 'Other';
    return [
      (idx + 1).toString(),
      formatDateTime(t.date),
      t.description || 'Expense',
      cat,
      payment,
      formatPdfCurrency(t.amount)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [['#', 'Date & Time', 'Description', 'Category', 'Payment Mode', 'Amount']],
    body: txRows.length > 0 ? txRows : [['-', '-', 'No transactions found for selected filters', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 36 },
      2: { fontStyle: 'normal' },
      3: { fontStyle: 'bold' },
      4: { cellWidth: 26 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 28, textColor: [15, 23, 42] }
    },
    didDrawPage: (pageData) => {
      // Footer on every page
      const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(
        'SettleMate • Local-First Personal Expense Manager',
        margin,
        pageHeight - 8
      );
      doc.text(
        `Page ${pageData.pageNumber}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    }
  });

  // Save the PDF directly to device
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `SettleMate_Expense_Report_${dateStamp}.pdf`;
  doc.save(fileName);
}
