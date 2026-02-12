/**
 * Formatting utilities — currency, percentages, dates, number abbreviation.
 */

export function formatCurrency(value, decimals = 2) {
  if (value == null || isNaN(value)) return '$0.00';
  const sign = value < 0 ? '-' : '';
  return sign + '$' + Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '0%';
  return value.toFixed(decimals) + '%';
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '0';
  return value.toLocaleString('en-US');
}

export function abbreviateNumber(value) {
  if (value == null || isNaN(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toString();
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export function formatProfitColor(value) {
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-muted';
}

export function formatProfitSign(value) {
  if (value > 0) return '+' + formatCurrency(value);
  return formatCurrency(value);
}
