/**
 * Deals & Coupons page — retail deals with category filters and upcoming events.
 */

import { getDeals } from '../api/deals.js';
import { skeletonCards } from '../components/skeleton.js';
import { formatCurrency, formatPercent, formatDate } from '../utils/format.js';

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Deals & Coupons</h2>
        <p>Find the best retail deals for sourcing inventory</p>
      </div>
      <div class="deals-filters" id="deals-filters">
        <button class="chip active" data-category="">All</button>
        <button class="chip" data-category="electronics">Electronics</button>
        <button class="chip" data-category="trading_cards">Trading Cards</button>
        <button class="chip" data-category="toys">Toys</button>
        <button class="chip" data-category="collectibles">Collectibles</button>
        <button class="chip" data-category="sneakers">Sneakers</button>
      </div>
      <div id="deals-content">${skeletonCards(6)}</div>
    </div>
  `;

  const content = container.querySelector('#deals-content');
  const filters = container.querySelector('#deals-filters');

  filters.addEventListener('click', (e) => {
    if (!e.target.classList.contains('chip')) return;
    filters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    loadDeals(content, e.target.dataset.category || null);
  });

  await loadDeals(content, null);
}

async function loadDeals(content, category) {
  content.innerHTML = skeletonCards(6);

  let data;
  try {
    data = await getDeals(category ? { category } : {});
  } catch {
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏷️</div><h3 class="empty-state-title">Could not load deals</h3></div>';
    return;
  }

  content.innerHTML = `
    <div class="grid grid-auto" style="margin-bottom: var(--space-6);">
      ${data.deals.map((deal, i) => `
        <div class="deal-card animate-fade-in-up" style="animation-delay: ${i * 50}ms;">
          <div class="deal-retailer">${deal.retailer}</div>
          <div class="deal-title">${deal.title}</div>
          ${deal.description ? `<p style="font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-3);">${deal.description}</p>` : ''}

          <div class="deal-pricing">
            ${deal.original_price ? `<span class="deal-original-price financial">${formatCurrency(deal.original_price)}</span>` : ''}
            ${deal.deal_price > 0 ? `<span class="deal-price">${formatCurrency(deal.deal_price)}</span>` : ''}
            ${deal.discount_pct ? `<span class="deal-discount">-${formatPercent(deal.discount_pct, 0)}</span>` : ''}
          </div>

          ${deal.profit_potential ? `
            <div style="font-size: var(--text-sm); margin-bottom: var(--space-3);">
              <span style="color: var(--text-tertiary);">Est. Profit:</span>
              <span class="financial text-profit" style="font-weight: 700;">+${formatCurrency(deal.profit_potential)}</span>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="deal-votes">
              <span>👍 ${deal.upvotes}</span>
              <span>👎 ${deal.downvotes}</span>
            </div>
            ${deal.end_date ? `<span style="font-size: var(--text-xs); color: var(--text-tertiary);">Ends ${formatDate(deal.end_date)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Upcoming Events -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Upcoming Sale Events</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--space-3);">
        ${data.upcoming_events.map(ev => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-scan-line);">
            <div>
              <div style="font-weight: 500; font-size: var(--text-sm);">${ev.name}</div>
              <div style="font-size: var(--text-xs); color: var(--text-tertiary);">${ev.retailers.join(', ')}</div>
            </div>
            <span class="badge badge-info">${formatDate(ev.date)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
