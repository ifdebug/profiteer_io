/**
 * Card component factory — creates styled card elements.
 */

export function createCard({ title, value, subtitle, footer, className = '', body = '' }) {
  const el = document.createElement('div');
  el.className = `card ${className}`;
  el.innerHTML = `
    ${title ? `
      <div class="card-header">
        <span class="card-title">${title}</span>
      </div>
    ` : ''}
    ${value ? `<div class="card-value">${value}</div>` : ''}
    ${subtitle ? `<div style="font-size: var(--text-sm); color: var(--text-tertiary); margin-top: var(--space-1);">${subtitle}</div>` : ''}
    ${body ? `<div class="card-body">${body}</div>` : ''}
    ${footer ? `<div class="card-footer">${footer}</div>` : ''}
  `;
  return el;
}

export function createStatCard({ title, value, change, changeType = 'profit', format = 'currency' }) {
  const el = document.createElement('div');
  el.className = 'card stat-card';
  const colorClass = changeType === 'profit' ? 'text-profit' : changeType === 'loss' ? 'text-loss' : '';
  const arrow = changeType === 'profit' ? '↑' : changeType === 'loss' ? '↓' : '';
  el.innerHTML = `
    <div class="card-title">${title}</div>
    <div class="stat-value financial" data-format="${format}">${value}</div>
    ${change != null ? `
      <div class="stat-change ${colorClass}">
        ${arrow} ${change}
      </div>
    ` : ''}
  `;
  return el;
}
