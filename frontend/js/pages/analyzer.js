/**
 * Profitability Analyzer page — search items, get marketplace profitability breakdown.
 *
 * Enhancements over Phase 1:
 * - Condition dropdown (New / Open Box / Refurbished / Used / For Parts)
 * - Search history dropdown from store.getAnalysisHistory()
 * - Save to history after successful analysis
 * - Improved loading state with animated dots + fake progress bar
 * - 4 stat cards row via createStatCard()
 * - Sortable table via createTable()
 * - Better empty/error states with retry buttons
 * - Client-side cache (5-min TTL) to avoid re-scraping
 * - Auto-fill from most recent history entry
 */

import { analyzeItem } from '../api/analyzer.js';
import { skeletonCards, skeletonTable } from '../components/skeleton.js';
import { createTable } from '../components/table.js';
import { createStatCard } from '../components/card.js';
import { store } from '../storage/models.js';
import { cache } from '../storage/cache.js';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatProfitColor,
  formatProfitSign,
  timeAgo,
} from '../utils/format.js';
import { $, clearElement } from '../utils/dom.js';

/** Escape HTML entities to prevent XSS in user-provided data. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Condition options ----
const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'open_box', label: 'Open Box' },
  { value: 'refurbished', label: 'Refurbished' },
  { value: 'used', label: 'Used' },
  { value: 'for_parts', label: 'For Parts' },
];

export async function init(container) {
  // Build condition <option> list
  const conditionOptions = CONDITIONS.map(
    c => `<option value="${c.value}">${c.label}</option>`
  ).join('');

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Profitability Analyzer</h2>
        <p>Enter an item to see where you'll make the most profit</p>
      </div>

      <form id="analyzer-form" class="analyzer-search">
        <div class="analyzer-search-wrapper">
          <input type="text" class="form-input" id="analyzer-query"
            placeholder="Item name, UPC, SKU, or URL..." autocomplete="off"
            aria-label="Item search">
          <div id="search-history-dropdown" class="search-history-dropdown"></div>
        </div>
        <input type="number" class="form-input analyzer-price-input" id="analyzer-price"
          placeholder="Purchase price" step="0.01" min="0" aria-label="Purchase price">
        <select class="form-input analyzer-condition-select" id="analyzer-condition"
          aria-label="Item condition">
          ${conditionOptions}
        </select>
        <button type="submit" class="btn btn-primary" id="analyzer-btn">Analyze</button>
      </form>

      <div id="analyzer-results"></div>
    </div>
  `;

  const form = $('#analyzer-form', container);
  const results = $('#analyzer-results', container);
  const queryInput = $('#analyzer-query', container);
  const priceInput = $('#analyzer-price', container);
  const conditionSelect = $('#analyzer-condition', container);
  const dropdown = $('#search-history-dropdown', container);
  const submitBtn = $('#analyzer-btn', container);

  // ---- Search history dropdown ----
  setupSearchHistory(queryInput, priceInput, conditionSelect, dropdown, results);

  // ---- Auto-fill from most recent history entry ----
  const history = store.getAnalysisHistory();
  if (history.length > 0) {
    const last = history[0];
    queryInput.value = last.query || '';
    priceInput.value = last.purchase_price ?? '';
    if (last.condition) conditionSelect.value = last.condition;

    // Auto-run analysis with last search
    if (last.query) {
      await runAnalysis(
        results, submitBtn,
        last.query,
        last.purchase_price ?? null,
        last.condition || 'new'
      );
    }
  }

  // ---- Form submit handler ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    const price = parseFloat(priceInput.value) || null;
    const condition = conditionSelect.value;
    if (!query) return;
    await runAnalysis(results, submitBtn, query, price, condition);
  });
}

// ---- Search history dropdown logic ----

function setupSearchHistory(queryInput, priceInput, conditionSelect, dropdown, resultsEl) {
  let blurTimer = null;

  function showDropdown() {
    const history = store.getAnalysisHistory();
    if (history.length === 0) {
      dropdown.classList.remove('open');
      return;
    }

    // Deduplicate by lowercased query, max 10
    const seen = new Set();
    const unique = [];
    for (const entry of history) {
      const key = (entry.query || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(entry);
      if (unique.length >= 10) break;
    }

    if (unique.length === 0) {
      dropdown.classList.remove('open');
      return;
    }

    dropdown.innerHTML = unique.map((entry, i) => `
      <div class="search-history-item" data-index="${i}">
        <div class="search-history-query">${escapeHtml(entry.query)}</div>
        <div class="search-history-meta">
          ${entry.purchase_price ? formatCurrency(entry.purchase_price) : ''}
          ${entry.best_marketplace ? `· ${escapeHtml(entry.best_marketplace)}` : ''}
          ${entry.savedAt ? `· ${timeAgo(entry.savedAt)}` : ''}
        </div>
      </div>
    `).join('');

    // Click handlers on items
    dropdown.querySelectorAll('.search-history-item').forEach((el, idx) => {
      el.addEventListener('mousedown', (e) => {
        // mousedown fires before blur — prevent blur from closing dropdown
        e.preventDefault();
        const entry = unique[idx];
        queryInput.value = entry.query || '';
        priceInput.value = entry.purchase_price ?? '';
        if (entry.condition) conditionSelect.value = entry.condition;
        dropdown.classList.remove('open');

        // Trigger analysis
        const submitBtn = document.querySelector('#analyzer-btn');
        const resultsContainer = document.querySelector('#analyzer-results');
        if (submitBtn && resultsContainer) {
          runAnalysis(
            resultsContainer, submitBtn,
            entry.query,
            entry.purchase_price ?? null,
            entry.condition || conditionSelect.value
          );
        }
      });
    });

    dropdown.classList.add('open');
  }

  queryInput.addEventListener('focus', showDropdown);
  queryInput.addEventListener('input', showDropdown);

  queryInput.addEventListener('blur', () => {
    // Delay to allow mousedown on dropdown items to fire first
    blurTimer = setTimeout(() => dropdown.classList.remove('open'), 200);
  });

  // If user clicks inside dropdown, cancel blur dismiss
  dropdown.addEventListener('mousedown', () => {
    clearTimeout(blurTimer);
  });
}

// ---- Analysis execution ----

async function runAnalysis(results, submitBtn, query, price, condition) {
  // Disable submit button during analysis
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing...';
  }

  // Show loading state with animated dots and progress bar
  results.innerHTML = `
    <div class="analyzer-loading animate-fade-in-up">
      <div class="analyzer-loading-text">
        Searching marketplaces<span class="loading-dots"></span>
      </div>
      <div class="progress-bar" style="margin-bottom: var(--space-6);">
        <div class="progress-fill profit analyzer-progress"></div>
      </div>
    </div>
    <div style="margin-bottom: var(--space-4);">${skeletonCards(4)}</div>
    ${skeletonTable(4, 9)}
  `;

  // Animate fake progress 0 → 90% over 15s
  const progressEl = results.querySelector('.analyzer-progress');
  if (progressEl) {
    progressEl.style.width = '0%';
    progressEl.style.transition = 'width 15s ease-out';
    // Force reflow before starting transition
    progressEl.offsetHeight;
    progressEl.style.width = '90%';
  }

  // Check client-side cache first
  const cacheKey = `analysis_${query.toLowerCase()}_${price}_${condition}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    renderResults(results, cached);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Analyze';
    }
    return;
  }

  let data;
  try {
    data = await analyzeItem({ query, purchase_price: price, condition });
  } catch (err) {
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3 class="empty-state-title">Analysis failed</h3>
        <p class="empty-state-description">${escapeHtml(err.message || 'Could not analyze this item. The backend may be offline.')}</p>
        <button class="btn btn-primary analyzer-retry-btn">Retry</button>
      </div>
    `;
    const retryBtn = results.querySelector('.analyzer-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => runAnalysis(results, submitBtn, query, price, condition));
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Analyze';
    }
    return;
  }

  // Check for no marketplace results
  if (!data.marketplaces || data.marketplaces.length === 0) {
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">No results found</h3>
        <p class="empty-state-description">No marketplace data found for "${escapeHtml(query)}". Try a different search term.</p>
        <button class="btn btn-primary analyzer-retry-btn">Try Again</button>
      </div>
    `;
    const retryBtn = results.querySelector('.analyzer-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        const queryInput = document.querySelector('#analyzer-query');
        if (queryInput) queryInput.focus();
      });
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Analyze';
    }
    return;
  }

  // Save to cache (5-min TTL)
  cache.set(cacheKey, data);

  // Save to history
  const best = data.marketplaces[0];
  store.saveAnalysis({
    query,
    purchase_price: price,
    condition,
    best_marketplace: data.best_marketplace,
    best_profit: data.best_profit,
  });

  renderResults(results, data);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Analyze';
  }
}

// ---- Render results ----

function renderResults(results, data) {
  clearElement(results);

  const best = data.marketplaces[0];

  // ---- Stat Cards Row ----
  const statsGrid = document.createElement('div');
  statsGrid.className = 'grid grid-4 animate-fade-in-up';
  statsGrid.style.marginBottom = 'var(--space-6)';

  // 1. Best Marketplace
  statsGrid.appendChild(createStatCard({
    title: 'Best Marketplace',
    value: data.best_marketplace || '—',
    format: 'text',
  }));

  // 2. Best Profit
  const profitType = data.best_profit > 0 ? 'profit' : data.best_profit < 0 ? 'loss' : '';
  statsGrid.appendChild(createStatCard({
    title: 'Best Profit',
    value: formatProfitSign(data.best_profit),
    change: best ? formatPercent(best.profit_margin) + ' margin' : null,
    changeType: profitType,
    format: 'currency',
  }));

  // 3. Sales Volume (sum across all marketplaces)
  const totalVolume = data.marketplaces.reduce(
    (sum, mp) => sum + (mp.sales_volume || 0), 0
  );
  statsGrid.appendChild(createStatCard({
    title: 'Sales Volume',
    value: totalVolume > 0 ? formatNumber(totalVolume) : '—',
    format: 'number',
  }));

  // 4. Avg ROI
  const roiValues = data.marketplaces.filter(mp => mp.roi != null);
  const avgRoi = roiValues.length > 0
    ? roiValues.reduce((sum, mp) => sum + mp.roi, 0) / roiValues.length
    : 0;
  const roiType = avgRoi > 0 ? 'profit' : avgRoi < 0 ? 'loss' : '';
  statsGrid.appendChild(createStatCard({
    title: 'Avg ROI',
    value: formatPercent(avgRoi),
    changeType: roiType,
    format: 'percent',
  }));

  results.appendChild(statsGrid);

  // ---- Sortable Marketplace Comparison Table ----
  const tableCard = document.createElement('div');
  tableCard.className = 'card animate-fade-in-up';
  tableCard.style.animationDelay = '100ms';

  const tableHeader = document.createElement('div');
  tableHeader.className = 'card-header';
  tableHeader.innerHTML = '<span class="card-title">Marketplace Comparison</span>';
  tableCard.appendChild(tableHeader);

  // Prepare table data — each row is a plain object keyed by column keys
  const tableData = data.marketplaces.map(mp => ({
    profitability: mp.profitability,
    marketplace: mp.marketplace,
    avg_sold_price: mp.avg_sold_price,
    fees: (mp.platform_fee || 0) + (mp.payment_processing_fee || 0),
    shipping: mp.estimated_shipping,
    net_profit: mp.net_profit,
    profit_margin: mp.profit_margin,
    roi: mp.roi,
    sales_volume: mp.sales_volume,
  }));

  const columns = [
    {
      key: 'profitability',
      label: '',
      sortable: false,
      render: (val) => {
        const cls = val === 'strong' ? 'profitability-strong'
          : val === 'marginal' ? 'profitability-marginal'
          : 'profitability-loss';
        return `<span class="profitability-indicator ${cls}"></span>`;
      },
    },
    {
      key: 'marketplace',
      label: 'Marketplace',
      render: (val) => `<strong>${escapeHtml(val || '')}</strong>`,
    },
    {
      key: 'avg_sold_price',
      label: 'Avg Sold',
      align: 'right',
      mono: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'fees',
      label: 'Fees',
      align: 'right',
      mono: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'shipping',
      label: 'Shipping',
      align: 'right',
      mono: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'net_profit',
      label: 'Net Profit',
      align: 'right',
      mono: true,
      render: (val) => {
        const cls = formatProfitColor(val);
        return `<span class="${cls}" style="font-weight:700;">${formatProfitSign(val)}</span>`;
      },
    },
    {
      key: 'profit_margin',
      label: 'Margin',
      align: 'right',
      mono: true,
      render: (val) => formatPercent(val),
    },
    {
      key: 'roi',
      label: 'ROI',
      align: 'right',
      mono: true,
      render: (val) => formatPercent(val),
    },
    {
      key: 'sales_volume',
      label: 'Volume',
      align: 'right',
      mono: true,
      render: (val) => val ? formatNumber(val) : '—',
    },
  ];

  const tableEl = createTable({ columns, data: tableData, id: 'analyzer-table' });
  tableCard.appendChild(tableEl);
  results.appendChild(tableCard);
}
