/**
 * Hype Analyzer page — item search with autocomplete, hype score gauge,
 * signal breakdown, trend history chart, and category leaderboards.
 *
 * Wired to real backend API:
 * - GET /hype?q=           → search items by name
 * - GET /hype/:id          → compute + return hype score
 * - GET /hype/leaderboards → top items per category
 */

import { getHypeScore, getLeaderboards, searchHypeItems } from '../api/hype.js';
import { createGauge, createLineChart } from '../components/chart.js';
import { skeletonCards, skeletonChart } from '../components/skeleton.js';
import { abbreviateNumber } from '../utils/format.js';
import { toast } from '../components/toast.js';

/** Escape HTML entities to prevent XSS in user-provided data. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- State ----
let gaugeInstance = null;
let historyChartInstance = null;
let currentItemId = null;
let searchTimeout = null;
let containerRef = null;

export async function init(container) {
  containerRef = container;

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Hype Analyzer</h2>
        <p>Measure buzz and demand to predict profitability</p>
      </div>

      <div class="hype-controls">
        <div class="hype-search-wrapper">
          <input type="text" class="form-input" id="hype-search"
                 placeholder="Search items by name..." style="max-width: 340px;"
                 aria-label="Product search" autocomplete="off">
          <div class="hype-search-dropdown" id="hype-dropdown"></div>
        </div>
      </div>

      <div id="hype-content">
        <div class="empty-state">
          <div class="empty-state-icon">🔥</div>
          <h3 class="empty-state-title">Search for an item to analyze hype</h3>
          <p class="empty-state-subtitle">Start by typing an item name above. Hype scores are calculated from price history data collected through the Profitability Analyzer.</p>
        </div>
      </div>

      <div id="hype-leaderboards" style="margin-top: var(--space-6);"></div>
    </div>
  `;

  const searchInput = container.querySelector('#hype-search');
  const dropdown = container.querySelector('#hype-dropdown');
  const content = container.querySelector('#hype-content');

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
    if (!e.target.closest('.hype-search-wrapper')) {
      dropdown.classList.remove('open');
    }
  });

  // Load leaderboards immediately
  loadLeaderboards(container);
}

// ---- Search & Autocomplete ----

async function runSearch(query, dropdown, content) {
  let results;
  try {
    results = await searchHypeItems(query);
  } catch {
    dropdown.classList.remove('open');
    toast.error('Search Failed', 'Could not search for items.');
    return;
  }

  if (!results || results.length === 0) {
    dropdown.innerHTML = `
      <div class="hype-dropdown-empty">
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
    <button class="hype-dropdown-item" data-id="${item.id}" data-name="${escapeHtml(item.name)}">
      <div class="hype-dropdown-item-name">${escapeHtml(item.name)}</div>
      <div class="hype-dropdown-item-meta">
        ${item.latest_score != null ? `Hype: ${item.latest_score}` : 'Not scored yet'}
        ${item.category ? ` · ${escapeHtml(item.category)}` : ''}
      </div>
    </button>
  `).join('');
  dropdown.classList.add('open');

  // Click handler on dropdown items
  dropdown.querySelectorAll('.hype-dropdown-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = parseInt(btn.dataset.id, 10);
      const itemName = btn.dataset.name;
      const searchInput = containerRef.querySelector('#hype-search');
      if (searchInput) searchInput.value = itemName;
      dropdown.classList.remove('open');
      currentItemId = itemId;
      loadHype(content, itemId);
    });
  });

  // Auto-select if only one result
  if (results.length === 1) {
    const item = results[0];
    const searchInput = containerRef.querySelector('#hype-search');
    if (searchInput) searchInput.value = item.name;
    dropdown.classList.remove('open');
    currentItemId = item.id;
    await loadHype(content, item.id);
  }
}

// ---- Load & Render Hype ----

async function loadHype(content, itemId) {
  content.innerHTML = `${skeletonChart()}${skeletonCards(3)}`;

  let data;
  try {
    data = await getHypeScore(itemId);
  } catch {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔥</div>
        <h3 class="empty-state-title">Could not load hype data</h3>
        <p class="empty-state-subtitle">Item may not exist or the server may be unavailable.</p>
      </div>
    `;
    return;
  }

  const trendColors = {
    rising: 'var(--profit)',
    peaking: 'var(--warning)',
    stable: 'var(--action)',
    falling: 'var(--loss)',
    dead: 'var(--text-disabled)',
  };
  const trendColor = trendColors[data.trend] || trendColors.stable;
  const trendBadge = data.trend === 'rising' ? 'profit' : data.trend === 'falling' || data.trend === 'dead' ? 'loss' : data.trend === 'peaking' ? 'warning' : 'info';

  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
      <!-- Gauge -->
      <div class="card animate-fade-in">
        <div class="hype-gauge-container">
          <div class="hype-gauge">
            <canvas id="hype-gauge-canvas"></canvas>
          </div>
          <div class="hype-score-value" style="color: ${trendColor};">${data.hype_score}</div>
          <div style="font-size: var(--text-xs); color: var(--text-tertiary);">out of 100</div>
          <div class="hype-trend-label" style="color: ${trendColor};">
            <span class="badge badge-${trendBadge}">${escapeHtml(data.trend)}</span>
          </div>
          <div style="font-size: var(--text-lg); font-weight: 600; margin-top: var(--space-3);">${escapeHtml(data.item_name)}</div>
        </div>
      </div>

      <!-- History Chart -->
      <div class="card animate-fade-in">
        <div class="card-header"><span class="card-title">Hype Score History</span></div>
        <div style="height: 200px;">
          <canvas id="hype-history-canvas"></canvas>
        </div>
      </div>
    </div>

    <!-- Signals -->
    <div class="hype-signals" style="margin-top: var(--space-4);">
      <div class="signal-card animate-fade-in-up" style="animation-delay: 50ms;">
        <div class="signal-value">${data.signals.google_trends}</div>
        <div class="signal-label">Price Velocity</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 100ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.reddit_mentions)}</div>
        <div class="signal-label">Data Points</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 150ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.twitter_mentions)}</div>
        <div class="signal-label">Daily Volume</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 200ms;">
        <div class="signal-value">${data.signals.youtube_videos}</div>
        <div class="signal-label">Marketplaces</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 250ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.youtube_views)}</div>
        <div class="signal-label">Price Change</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 300ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.tiktok_views)}</div>
        <div class="signal-label">Momentum</div>
      </div>
    </div>
  `;

  // Render gauge
  if (gaugeInstance) gaugeInstance.destroy();
  const gaugeCanvas = content.querySelector('#hype-gauge-canvas');
  gaugeInstance = createGauge(gaugeCanvas, { value: data.hype_score, max: 100 });

  // Render history chart
  if (historyChartInstance) historyChartInstance.destroy();
  if (data.history && data.history.length) {
    const historyCanvas = content.querySelector('#hype-history-canvas');
    historyChartInstance = createLineChart(historyCanvas, {
      labels: data.history.map(h => h.date.slice(5)),
      datasets: [{
        label: 'Hype Score',
        data: data.history.map(h => h.score),
        color: '#00E5CC',
        fill: true,
      }],
      options: {
        scales: {
          y: { min: 0, max: 100 },
        },
      },
    });
  }
}

async function loadLeaderboards(container) {
  const section = container.querySelector('#hype-leaderboards');

  let data;
  try {
    data = await getLeaderboards();
  } catch {
    return;
  }

  const categories = Object.entries(data.leaderboards);
  if (categories.length === 0) {
    section.innerHTML = `
      <div class="empty-state" style="padding: var(--space-6);">
        <div class="empty-state-icon">🏆</div>
        <h3 class="empty-state-title">No leaderboard data yet</h3>
        <p class="empty-state-subtitle">Leaderboards populate as you analyze items. Search for an item above to start building hype data.</p>
      </div>
    `;
    return;
  }

  section.innerHTML = `
    <h3 style="margin-bottom: var(--space-4);">Category Leaderboards</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4);">
      ${categories.map(([category, items]) => `
        <div class="card">
          <div class="card-header">
            <span class="card-title">${escapeHtml(category.replace(/_/g, ' '))}</span>
          </div>
          <div class="leaderboard-list">
            ${items.map((item, i) => {
              const scoreColor = item.score >= 70 ? 'var(--profit)' : item.score >= 40 ? 'var(--warning)' : 'var(--text-tertiary)';
              const badge = item.trend === 'rising' ? 'badge-profit' : item.trend === 'falling' || item.trend === 'dead' ? 'badge-loss' : 'badge-info';
              return `
                <button class="leaderboard-item leaderboard-item-btn" data-item-id="${item.item_id}">
                  <div class="leaderboard-rank">#${i + 1}</div>
                  <div class="leaderboard-name">${escapeHtml(item.name)}</div>
                  <span class="badge ${badge}" style="font-size: 10px;">${escapeHtml(item.trend)}</span>
                  <div class="leaderboard-score" style="color: ${scoreColor};">${item.score}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Click handler for leaderboard items — load that item's hype
  section.querySelectorAll('.leaderboard-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = parseInt(btn.dataset.itemId, 10);
      const itemName = btn.querySelector('.leaderboard-name').textContent;
      const searchInput = containerRef.querySelector('#hype-search');
      if (searchInput) searchInput.value = itemName;
      currentItemId = itemId;
      const content = containerRef.querySelector('#hype-content');
      loadHype(content, itemId);
      // Scroll to top of content
      content.scrollIntoView({ behavior: 'smooth' });
    });
  });
}
