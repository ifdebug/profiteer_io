/**
 * Profitability Analyzer page — search for items, get marketplace profitability breakdown.
 */

import { analyzeItem } from '../api/analyzer.js';
import { skeletonCards, skeletonTable } from '../components/skeleton.js';
import { formatCurrency, formatPercent } from '../utils/format.js';

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Profitability Analyzer</h2>
        <p>Enter an item to see where you'll make the most profit</p>
      </div>

      <form id="analyzer-form" class="analyzer-search">
        <input type="text" class="form-input" id="analyzer-query" placeholder="Item name, UPC, SKU, or URL..." value="Pokemon Scarlet & Violet 151 Booster Bundle" aria-label="Item search">
        <input type="number" class="form-input" id="analyzer-price" placeholder="Purchase price" value="25.00" step="0.01" min="0" style="max-width: 160px;" aria-label="Purchase price">
        <button type="submit" class="btn btn-primary">Analyze</button>
      </form>

      <div id="analyzer-results"></div>
    </div>
  `;

  const form = container.querySelector('#analyzer-form');
  const results = container.querySelector('#analyzer-results');

  // Auto-analyze on load with default values
  await runAnalysis(results, 'Pokemon Scarlet & Violet 151 Booster Bundle', 25.00);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = container.querySelector('#analyzer-query').value.trim();
    const price = parseFloat(container.querySelector('#analyzer-price').value) || null;
    if (!query) return;
    await runAnalysis(results, query, price);
  });
}

async function runAnalysis(results, query, price) {
  results.innerHTML = `
    <div style="margin-bottom: var(--space-4);">${skeletonCards(1)}</div>
    ${skeletonTable(6, 5)}
  `;

  let data;
  try {
    data = await analyzeItem({ query, purchase_price: price });
  } catch {
    results.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">Analysis failed</h3>
        <p class="empty-state-description">Could not analyze this item. Try again.</p>
      </div>
    `;
    return;
  }

  const best = data.marketplaces[0];
  const profitColor = data.best_profit > 0 ? 'text-profit-strong' : 'text-loss-strong';

  results.innerHTML = `
    <!-- Summary Card -->
    <div class="profit-summary-card animate-fade-in-up">
      <div class="best-marketplace">Best marketplace: <strong>${data.best_marketplace}</strong></div>
      <div class="best-profit ${profitColor} financial">${data.best_profit >= 0 ? '+' : ''}${formatCurrency(data.best_profit)}</div>
      <div class="profit-label">estimated net profit per unit</div>
      <div style="margin-top: var(--space-3); font-size: var(--text-sm); color: var(--text-tertiary);">
        Purchase: ${formatCurrency(data.purchase_price)} · Sale: ${formatCurrency(best.avg_sold_price)} · ROI: ${formatPercent(best.roi)}
      </div>
    </div>

    <!-- Marketplace Comparison Table -->
    <div class="card animate-fade-in-up" style="animation-delay: 100ms;">
      <div class="card-header">
        <span class="card-title">Marketplace Comparison</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Marketplace</th>
              <th style="text-align:right;">Avg Sold</th>
              <th style="text-align:right;">Fees</th>
              <th style="text-align:right;">Shipping</th>
              <th style="text-align:right;">Net Profit</th>
              <th style="text-align:right;">Margin</th>
              <th style="text-align:right;">ROI</th>
              <th style="text-align:right;">Volume</th>
            </tr>
          </thead>
          <tbody>
            ${data.marketplaces.map(mp => {
              const profitClass = mp.profitability === 'strong' ? 'text-profit' : mp.profitability === 'marginal' ? 'text-warning' : 'text-loss';
              const dotClass = mp.profitability === 'strong' ? 'profitability-strong' : mp.profitability === 'marginal' ? 'profitability-marginal' : 'profitability-loss';
              return `
                <tr>
                  <td><span class="profitability-indicator ${dotClass}"></span></td>
                  <td><strong>${mp.marketplace}</strong></td>
                  <td class="financial" style="text-align:right;">${formatCurrency(mp.avg_sold_price)}</td>
                  <td class="financial" style="text-align:right;">${formatCurrency(mp.platform_fee + mp.payment_processing_fee)}</td>
                  <td class="financial" style="text-align:right;">${formatCurrency(mp.estimated_shipping)}</td>
                  <td class="financial ${profitClass}" style="text-align:right; font-weight:700;">${mp.net_profit >= 0 ? '+' : ''}${formatCurrency(mp.net_profit)}</td>
                  <td class="financial" style="text-align:right;">${formatPercent(mp.profit_margin)}</td>
                  <td class="financial" style="text-align:right;">${formatPercent(mp.roi)}</td>
                  <td class="financial" style="text-align:right;">${mp.sales_volume ? mp.sales_volume.toLocaleString() : '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
