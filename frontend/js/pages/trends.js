/**
 * Price Trends page — item search with autocomplete, interactive multi-line
 * chart with marketplace overlays, period selector, and trend statistics.
 *
 * Wired to real backend API:
 * - GET /trends?q=        → search items by name
 * - GET /trends/:id       → price history for an item
 */

import { getTrends, searchItems } from '../api/trends.js';
import { createLineChart } from '../components/chart.js';
import { skeletonChart, skeletonCards } from '../components/skeleton.js';
import { formatCurrency, formatPercent } from '../utils/format.js';
import { CHART_COLORS } from '../utils/constants.js';
import { toast } from '../components/toast.js';

/** Escape HTML entities to prevent XSS in user-provided data. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- State ----
let chartInstance = null;
let currentItemId = null;
let currentPeriod = '30d';
let searchTimeout = null;
let containerRef = null;

export async function init(container) {
  containerRef = container;

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Price Trends</h2>
        <p>Track how item prices change across marketplaces over time</p>
      </div>

      <div class="trends-controls">
        <div class="trends-search-wrapper">
          <input type="text" class="form-input" id="trends-search"
                 placeholder="Search items by name..." style="max-width: 320px;"
                 aria-label="Item search" autocomplete="off">
          <div class="trends-search-dropdown" id="trends-dropdown"></div>
        </div>
        <div class="period-selector" id="period-selector">
          <button class="period-btn" data-period="7d">7D</button>
          <button class="period-btn active" data-period="30d">30D</button>
          <button class="period-btn" data-period="90d">90D</button>
          <button class="period-btn" data-period="1y">1Y</button>
          <button class="period-btn" data-period="all">All</button>
        </div>
      </div>

      <div id="trends-content">
        <div class="empty-state">
          <div class="empty-state-icon">📈</div>
          <h3 class="empty-state-title">Search for an item to view price trends</h3>
          <p class="empty-state-subtitle">Start by typing an item name above. Trends are populated when you analyze items in the Profitability Analyzer.</p>
        </div>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#trends-search');
  const dropdown = container.querySelector('#trends-dropdown');
  const content = container.querySelector('#trends-content');

  // ---- Search input with live autocomplete ----
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (query.length < 2) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      return;
    }
    searchTimeout = setTimeout(() => runSearch(query, dropdown, content), 300);
  });

  // Enter key triggers search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        runSearch(query, dropdown, content);
      }
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.trends-search-wrapper')) {
      dropdown.classList.remove('open');
    }
  });

  // ---- Period selector ----
  container.querySelector('#period-selector').addEventListener('click', async (e) => {
    if (!e.target.classList.contains('period-btn')) return;
    container.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentPeriod = e.target.dataset.period;
    if (currentItemId) {
      await loadTrends(content, currentItemId, currentPeriod);
    }
  });
}

// ---- Search & Autocomplete ----

async function runSearch(query, dropdown, content) {
  let results;
  try {
    results = await searchItems(query);
  } catch {
    dropdown.classList.remove('open');
    toast.error('Search Failed', 'Could not search for items.');
    return;
  }

  if (!results || results.length === 0) {
    dropdown.innerHTML = `
      <div class="trends-dropdown-empty">
        No items found for "${escapeHtml(query)}".<br>
        <span style="font-size: var(--text-xs); color: var(--text-tertiary);">
          Analyze an item first to add it to the database.
        </span>
      </div>
    `;
    dropdown.classList.add('open');
    return;
  }

  dropdown.innerHTML = results.map(item => `
    <button class="trends-dropdown-item" data-id="${item.id}" data-name="${escapeHtml(item.name)}">
      <div class="trends-dropdown-item-name">${escapeHtml(item.name)}</div>
      <div class="trends-dropdown-item-meta">
        ${item.price_count} price point${item.price_count !== 1 ? 's' : ''}
        ${item.category ? ` · ${escapeHtml(item.category)}` : ''}
      </div>
    </button>
  `).join('');
  dropdown.classList.add('open');

  // Click handler on dropdown items
  dropdown.querySelectorAll('.trends-dropdown-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = parseInt(btn.dataset.id, 10);
      const itemName = btn.dataset.name;
      const searchInput = containerRef.querySelector('#trends-search');
      if (searchInput) searchInput.value = itemName;
      dropdown.classList.remove('open');
      currentItemId = itemId;
      loadTrends(content, itemId, currentPeriod);
    });
  });

  // Auto-select if only one result
  if (results.length === 1) {
    const item = results[0];
    const searchInput = containerRef.querySelector('#trends-search');
    if (searchInput) searchInput.value = item.name;
    dropdown.classList.remove('open');
    currentItemId = item.id;
    await loadTrends(content, item.id, currentPeriod);
  }
}

// ---- Load & Render Trends ----

async function loadTrends(content, itemId, period) {
  content.innerHTML = `${skeletonChart()}<div style="margin-top: var(--space-4);">${skeletonCards(4)}</div>`;

  let data;
  try {
    data = await getTrends(itemId, period);
  } catch {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📈</div>
        <h3 class="empty-state-title">Could not load trends</h3>
        <p class="empty-state-subtitle">Item may not exist or the server may be unavailable.</p>
      </div>
    `;
    return;
  }

  const marketplaceNames = Object.keys(data.marketplaces);

  // If no price data at all, show helpful empty state
  if (marketplaceNames.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3 class="empty-state-title">No price data yet for "${escapeHtml(data.item_name)}"</h3>
        <p class="empty-state-subtitle">Run a profitability analysis on this item to start collecting price data.</p>
      </div>
    `;
    return;
  }

  const changeClass = data.price_change_pct >= 0 ? 'text-profit' : 'text-loss';
  const changeSign = data.price_change_pct >= 0 ? '+' : '';
  const trendBadge = data.trend === 'rising' ? 'profit' : data.trend === 'falling' ? 'loss' : 'info';

  content.innerHTML = `
    <div class="chart-container animate-fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <div>
          <h3 style="font-size: var(--text-lg);">${escapeHtml(data.item_name)}</h3>
          <div style="display: flex; align-items: baseline; gap: var(--space-2); margin-top: var(--space-1);">
            <span class="financial" style="font-size: var(--text-2xl); font-weight: 700;">${formatCurrency(data.current_price)}</span>
            <span class="${changeClass}" style="font-weight: 600;">${changeSign}${formatPercent(data.price_change_pct)}</span>
            <span class="badge badge-${trendBadge}">${escapeHtml(data.trend)}</span>
          </div>
        </div>
      </div>
      <div class="chart-canvas-wrapper">
        <canvas id="trends-chart"></canvas>
      </div>
    </div>

    <div class="trend-stats animate-fade-in-up" style="margin-top: var(--space-4);">
      ${marketplaceNames.map(name => {
        const mp = data.marketplaces[name];
        return `
        <div class="card" style="padding: var(--space-4);">
          <div class="card-title" style="margin-bottom: var(--space-2); text-transform: capitalize;">${escapeHtml(name)}</div>
          <div class="financial" style="font-size: var(--text-xl); font-weight: 700;">${formatCurrency(mp.current)}</div>
          <div style="display: flex; justify-content: space-between; margin-top: var(--space-2); font-size: var(--text-xs); color: var(--text-tertiary);">
            <span>H: ${formatCurrency(mp.high)}</span>
            <span>L: ${formatCurrency(mp.low)}</span>
            <span>Avg: ${formatCurrency(mp.avg)}</span>
          </div>
          <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-1);">
            ${mp.data.length} data point${mp.data.length !== 1 ? 's' : ''}
          </div>
        </div>
      `}).join('')}
    </div>

    <div class="card animate-fade-in-up" style="margin-top: var(--space-4); padding: var(--space-4);">
      <div class="card-title" style="margin-bottom: var(--space-2);">Volume</div>
      <div style="display: flex; gap: var(--space-6);">
        <div><span class="financial" style="font-weight: 700;">${data.volume.total_sales_period.toLocaleString()}</span> <span style="color: var(--text-tertiary); font-size: var(--text-sm);">total sales</span></div>
        <div><span class="financial" style="font-weight: 700;">${data.volume.avg_daily_sales}</span> <span style="color: var(--text-tertiary); font-size: var(--text-sm);">avg/day</span></div>
      </div>
    </div>
  `;

  // ---- Build Chart ----
  const canvas = content.querySelector('#trends-chart');
  if (chartInstance) chartInstance.destroy();

  const firstMp = data.marketplaces[marketplaceNames[0]];
  const labels = firstMp.data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const datasets = marketplaceNames.map((name, i) => ({
    label: name.charAt(0).toUpperCase() + name.slice(1),
    data: data.marketplaces[name].data.map(d => d.price),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  chartInstance = createLineChart(canvas, {
    labels,
    datasets,
    options: {
      scales: {
        y: {
          ticks: {
            callback: (v) => '$' + v,
          },
        },
      },
    },
  });
}
