import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Formats a numeric amount into Indian Rupee format (e.g. ₹1,50,000 or ₹500)
 */
export function formatCurrency(amount: number, symbol = '₹'): string {
  const rounded = Math.abs(Math.round(amount * 100) / 100);
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2
  }).format(rounded);

  const prefix = amount < 0 ? '-' : '';
  return `${prefix}${symbol}${formattedNumber}`;
}

/**
 * Formats ISO date string into readable date (e.g. 15 Sep 2026)
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    return format(date, 'dd MMM yyyy');
  } catch (e) {
    return dateString;
  }
}

/**
 * Formats ISO date string into readable date & time (e.g. 15 Sep 2026, 7:42 PM)
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    return format(date, 'dd MMM yyyy, h:mm a');
  } catch (e) {
    return dateString;
  }
}

/**
 * Relative date formatter (Today, Yesterday, 2 days ago, or full date)
 */
export function formatRelativeDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return dateString;
  }
}
