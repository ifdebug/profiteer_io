/**
 * Arbitrage Finder page — cross-platform price discrepancy opportunities.
 */

import { getOpportunities } from '../api/arbitrage.js';
import { skeletonCards } from '../components/skeleton.js';
import { formatCurrency, formatPercent } from '../utils/format.js';

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Arbitrage Finder</h2>
        <p>Find items you can buy low and sell high across platforms</p>
      </div>

      <div class="arbitrage-filters" id="arb-filters">
        <button class="chip active" data-category="">All</button>
        <button class="chip" data-category="trading_cards">Trading Cards</button>
        <button class="chip" data-category="sneakers">Sneakers</button>
        <button class="chip" data-category="electronics">Electronics</button>
        <button class="chip" data-category="toys">Toys</button>
        <button class="chip" data-category="collectibles">Collectibles</button>
      </div>

      <div id="arb-content">${skeletonCards(6)}</div>
    </div>
  `;

  const content = container.querySelector('#arb-content');
  const filters = container.querySelector('#arb-filters');

  filters.addEventListener('click', (e) => {
    if (!e.target.classList.contains('chip')) return;
    filters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    loadOpportunities(content, e.target.dataset.category || null);
  });

  await loadOpportunities(content, null);
}

async function loadOpportunities(content, category) {
  content.innerHTML = skeletonCards(6);

  let data;
  try {
    data = await getOpportunities(category ? { category } : {});
  } catch {
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><h3 class="empty-state-title">Could not load opportunities</h3></div>';
    return;
  }

  if (!data.opportunities.length) {
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><h3 class="empty-state-title">No opportunities found</h3><p class="empty-state-description">Try a different category or check back later.</p></div>';
    return;
  }

  content.innerHTML = `
    <div class="grid grid-auto">
      ${data.opportunities.map((opp, i) => {
        const profitClass = opp.estimated_profit > 15 ? 'text-profit-strong' : opp.estimated_profit > 5 ? 'text-profit' : 'text-warning';
        const profitBg = opp.estimated_profit > 15 ? 'var(--profit-bg)' : opp.estimated_profit > 5 ? 'var(--profit-bg)' : 'var(--warning-bg)';
        const riskColor = opp.risk_score < 30 ? 'var(--profit)' : opp.risk_score < 60 ? 'var(--warning)' : 'var(--loss)';
        return `
          <div class="opportunity-card animate-fade-in-up" style="animation-delay: ${i * 50}ms;">
            <div class="opportunity-header">
              <span class="opportunity-name">${opp.item_name}</span>
              <span class="badge badge-${opp.confidence === 'high' ? 'profit' : opp.confidence === 'medium' ? 'warning' : 'loss'}">${opp.confidence}</span>
            </div>

            <div class="opportunity-flow">
              <div class="flow-platform">
                <div class="platform-name">Buy on ${opp.buy_platform}</div>
                <div class="platform-price financial">${formatCurrency(opp.buy_price)}</div>
              </div>
              <div class="flow-arrow">→</div>
              <div class="flow-platform">
                <div class="platform-name">Sell on ${opp.sell_platform}</div>
                <div class="platform-price financial">${formatCurrency(opp.sell_price)}</div>
              </div>
            </div>

            <div class="opportunity-profit ${profitClass}" style="background: ${profitBg};">
              +${formatCurrency(opp.estimated_profit)} profit
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: var(--space-3); font-size: var(--text-xs); color: var(--text-tertiary);">
              <span>Margin: ${formatPercent(opp.profit_margin)}</span>
              <span>ROI: ${formatPercent(opp.roi)}</span>
              <span>~${opp.avg_days_to_sell}d to sell</span>
            </div>

            <div class="risk-indicator">
              <span>Risk:</span>
              <div class="risk-bar">
                <div class="risk-fill" style="width: ${opp.risk_score}%; background: ${riskColor};"></div>
              </div>
              <span>${opp.risk_score}%</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
