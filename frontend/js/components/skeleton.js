/**
 * Skeleton loader factory — generates shimmer placeholders for loading states.
 */

export function skeletonText(lines = 3) {
  let html = '';
  for (let i = 0; i < lines; i++) {
    const width = i === lines - 1 ? '60%' : (80 + Math.random() * 20) + '%';
    html += `<div class="skeleton skeleton-text" style="width: ${width}"></div>`;
  }
  return html;
}

export function skeletonHeading() {
  return '<div class="skeleton skeleton-heading"></div>';
}

export function skeletonCard() {
  return '<div class="skeleton skeleton-card"></div>';
}

export function skeletonChart() {
  return '<div class="skeleton skeleton-chart"></div>';
}

export function skeletonCards(count = 4) {
  let html = '<div class="grid grid-auto">';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="card" style="padding: var(--space-5);">
        ${skeletonHeading()}
        ${skeletonText(2)}
      </div>
    `;
  }
  html += '</div>';
  return html;
}

export function skeletonTable(rows = 5, cols = 4) {
  let html = '<div class="table-responsive"><table class="data-table"><thead><tr>';
  for (let c = 0; c < cols; c++) {
    html += '<th><div class="skeleton" style="height:12px;width:80px;"></div></th>';
  }
  html += '</tr></thead><tbody>';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      const w = 50 + Math.random() * 50;
      html += `<td><div class="skeleton" style="height:14px;width:${w}%;"></div></td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

export function skeletonDashboard() {
  return `
    <div class="page-container">
      ${skeletonHeading()}
      <div class="dashboard-grid" style="margin-bottom: var(--space-6);">
        <div class="card">${skeletonText(2)}</div>
        <div class="card">${skeletonText(2)}</div>
        <div class="card">${skeletonText(2)}</div>
        <div class="card">${skeletonText(2)}</div>
      </div>
      <div class="grid grid-2">
        <div class="card">${skeletonChart()}</div>
        <div class="card">${skeletonText(5)}</div>
      </div>
    </div>
  `;
}
