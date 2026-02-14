/**
 * Deals & Coupons page — retail deals with voting, add form, and category filters.
 */

import { getDeals, createDeal, deleteDeal, voteDeal } from '../api/deals.js';
import { skeletonCards } from '../components/skeleton.js';
import { openModal, closeModal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { formatCurrency, formatPercent, formatDate, timeAgo } from '../utils/format.js';

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let currentCategory = null;
let currentSort = 'newest';

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <h2>Deals &amp; Coupons</h2>
          <p>Find the best retail deals for sourcing inventory</p>
        </div>
        <button class="btn btn-primary" id="deals-add-btn">+ Add Deal</button>
      </div>

      <div class="deals-toolbar">
        <div class="deals-filters" id="deals-filters">
          <button class="chip active" data-category="">All</button>
          <button class="chip" data-category="electronics">Electronics</button>
          <button class="chip" data-category="trading_cards">Trading Cards</button>
          <button class="chip" data-category="toys">Toys</button>
          <button class="chip" data-category="collectibles">Collectibles</button>
          <button class="chip" data-category="sneakers">Sneakers</button>
        </div>
        <div class="deals-sort">
          <label for="deals-sort-select" class="sr-only">Sort by</label>
          <select id="deals-sort-select" class="input" style="min-width: 140px;">
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="discount">Biggest Discount</option>
            <option value="profit">Highest Profit</option>
          </select>
        </div>
      </div>

      <div id="deals-content">${skeletonCards(6)}</div>
    </div>
  `;

  const content = container.querySelector('#deals-content');
  const filters = container.querySelector('#deals-filters');
  const sortSelect = container.querySelector('#deals-sort-select');
  const addBtn = container.querySelector('#deals-add-btn');

  // Category filter clicks
  filters.addEventListener('click', (e) => {
    if (!e.target.classList.contains('chip')) return;
    filters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentCategory = e.target.dataset.category || null;
    loadDeals(content);
  });

  // Sort change
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    loadDeals(content);
  });

  // Add deal button
  addBtn.addEventListener('click', () => openAddDealModal(content));

  await loadDeals(content);
}

async function loadDeals(content) {
  content.innerHTML = skeletonCards(6);

  const params = {};
  if (currentCategory) params.category = currentCategory;
  if (currentSort !== 'newest') params.sort = currentSort;

  let data;
  try {
    data = await getDeals(params);
  } catch {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏷️</div>
        <h3 class="empty-state-title">Could not load deals</h3>
        <p class="empty-state-description">Check your connection and try again.</p>
        <button class="btn btn-primary" id="deals-retry">Retry</button>
      </div>`;
    content.querySelector('#deals-retry')?.addEventListener('click', () => loadDeals(content));
    return;
  }

  if (!data.deals || data.deals.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏷️</div>
        <h3 class="empty-state-title">No deals found</h3>
        <p class="empty-state-description">${currentCategory ? 'No deals in this category yet.' : 'Be the first to add a deal!'}</p>
        <button class="btn btn-primary" id="deals-add-first">+ Add Deal</button>
      </div>`;
    content.querySelector('#deals-add-first')?.addEventListener('click', () => openAddDealModal(content));
    renderUpcomingEvents(content, data.upcoming_events || []);
    return;
  }

  // Stats row
  const totalDeals = data.total || data.deals.length;
  const avgDiscount = data.deals.reduce((s, d) => s + (d.discount_pct || 0), 0) / data.deals.length;
  const bestProfit = Math.max(...data.deals.map(d => d.profit_potential || 0));
  const topRetailer = getMostFrequent(data.deals.map(d => d.retailer));

  content.innerHTML = `
    <div class="grid grid-4 deals-stats">
      <div class="stat-card">
        <div class="stat-label">Total Deals</div>
        <div class="stat-value">${totalDeals}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Discount</div>
        <div class="stat-value">${formatPercent(avgDiscount, 0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Best Profit</div>
        <div class="stat-value text-profit">${formatCurrency(bestProfit)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Top Retailer</div>
        <div class="stat-value" style="font-size: var(--text-lg);">${escapeHtml(topRetailer)}</div>
      </div>
    </div>

    <div class="grid grid-auto deals-grid" id="deals-grid"></div>

    <div id="deals-events"></div>
  `;

  const grid = content.querySelector('#deals-grid');
  renderDealCards(grid, data.deals, content);
  renderUpcomingEvents(content.querySelector('#deals-events'), data.upcoming_events || []);
}

function renderDealCards(grid, deals, content) {
  grid.innerHTML = deals.map((deal, i) => `
    <div class="deal-card animate-fade-in-up" style="animation-delay: ${i * 50}ms;" data-deal-id="${deal.id}">
      <div class="deal-card-header">
        <div class="deal-retailer">${escapeHtml(deal.retailer)}</div>
        <button class="btn-icon deal-delete-btn" data-deal-id="${deal.id}" title="Delete deal" aria-label="Delete deal">&times;</button>
      </div>
      <div class="deal-title">${escapeHtml(deal.title)}</div>
      ${deal.description ? `<p class="deal-description">${escapeHtml(deal.description)}</p>` : ''}

      <div class="deal-pricing">
        ${deal.original_price ? `<span class="deal-original-price financial">${formatCurrency(deal.original_price)}</span>` : ''}
        ${deal.deal_price > 0 ? `<span class="deal-price">${formatCurrency(deal.deal_price)}</span>` : ''}
        ${deal.discount_pct ? `<span class="deal-discount">-${formatPercent(deal.discount_pct, 0)}</span>` : ''}
      </div>

      ${deal.profit_potential ? `
        <div class="deal-profit-row">
          <span class="deal-profit-label">Est. Profit:</span>
          <span class="financial text-profit deal-profit-value">+${formatCurrency(deal.profit_potential)}</span>
        </div>
      ` : ''}

      <div class="deal-footer">
        <div class="deal-votes">
          <button class="vote-btn vote-up" data-deal-id="${deal.id}" data-direction="up" title="Upvote">
            <span class="vote-icon">▲</span>
            <span class="vote-count" id="upvotes-${deal.id}">${deal.upvotes || 0}</span>
          </button>
          <button class="vote-btn vote-down" data-deal-id="${deal.id}" data-direction="down" title="Downvote">
            <span class="vote-icon">▼</span>
            <span class="vote-count" id="downvotes-${deal.id}">${deal.downvotes || 0}</span>
          </button>
        </div>
        <div class="deal-meta">
          ${deal.url ? `<a href="${escapeHtml(deal.url)}" target="_blank" rel="noopener noreferrer" class="deal-link">View Deal →</a>` : ''}
          ${deal.end_date ? `<span class="deal-expiry">Ends ${formatDate(deal.end_date)}</span>` : ''}
        </div>
      </div>
      ${deal.created_at ? `<div class="deal-timestamp">${timeAgo(deal.created_at)}</div>` : ''}
    </div>
  `).join('');

  // Vote button handlers
  grid.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const dealId = btn.dataset.dealId;
      const direction = btn.dataset.direction;
      try {
        const updated = await voteDeal(dealId, direction);
        const upEl = grid.querySelector(`#upvotes-${dealId}`);
        const downEl = grid.querySelector(`#downvotes-${dealId}`);
        if (upEl) upEl.textContent = updated.upvotes;
        if (downEl) downEl.textContent = updated.downvotes;
        btn.classList.add('vote-active');
        setTimeout(() => btn.classList.remove('vote-active'), 300);
      } catch {
        toast.error('Vote Failed', 'Could not register your vote.');
      }
    });
  });

  // Delete button handlers
  grid.querySelectorAll('.deal-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const dealId = btn.dataset.dealId;
      const card = btn.closest('.deal-card');
      const title = card.querySelector('.deal-title')?.textContent || 'this deal';

      openModal({
        title: 'Delete Deal',
        content: `<p>Are you sure you want to delete <strong>${escapeHtml(title)}</strong>?</p>`,
        footer: `
          <button class="btn btn-ghost" id="deal-delete-cancel">Cancel</button>
          <button class="btn btn-danger" id="deal-delete-confirm">Delete</button>
        `,
      });

      document.getElementById('deal-delete-cancel')?.addEventListener('click', closeModal);
      document.getElementById('deal-delete-confirm')?.addEventListener('click', async () => {
        closeModal();
        try {
          await deleteDeal(dealId);
          card.style.transition = 'opacity 0.3s, transform 0.3s';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(async () => {
            toast.success('Deal Deleted', 'The deal has been removed.');
            await loadDeals(content);
          }, 300);
        } catch {
          toast.error('Delete Failed', 'Could not delete the deal.');
        }
      });
    });
  });
}

function renderUpcomingEvents(container, events) {
  if (!events.length) return;

  const eventsHtml = `
    <div class="card" style="margin-top: var(--space-6);">
      <div class="card-header">
        <span class="card-title">📅 Upcoming Sale Events</span>
      </div>
      <div class="deals-events-list">
        ${events.map(ev => `
          <div class="deals-event-item">
            <div class="deals-event-info">
              <div class="deals-event-name">${escapeHtml(ev.name)}</div>
              <div class="deals-event-retailers">${ev.retailers.map(r => escapeHtml(r)).join(', ')}</div>
            </div>
            <span class="badge badge-info">${formatDate(ev.date)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  if (container.id === 'deals-events') {
    container.innerHTML = eventsHtml;
  } else {
    container.insertAdjacentHTML('beforeend', eventsHtml);
  }
}

function openAddDealModal(content) {
  openModal({
    title: 'Add New Deal',
    content: `
      <form id="add-deal-form" class="deal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="deal-retailer">Retailer *</label>
            <select id="deal-retailer" class="input" required>
              <option value="">Select retailer...</option>
              <option value="Walmart">Walmart</option>
              <option value="Target">Target</option>
              <option value="Amazon">Amazon</option>
              <option value="Best Buy">Best Buy</option>
              <option value="GameStop">GameStop</option>
              <option value="Costco">Costco</option>
            </select>
          </div>
          <div class="form-group">
            <label for="deal-category">Category</label>
            <select id="deal-category" class="input">
              <option value="">Select category...</option>
              <option value="electronics">Electronics</option>
              <option value="trading_cards">Trading Cards</option>
              <option value="toys">Toys</option>
              <option value="collectibles">Collectibles</option>
              <option value="sneakers">Sneakers</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="deal-title">Title *</label>
          <input type="text" id="deal-title" class="input" placeholder="e.g. Pokemon 151 Booster Bundle - 30% Off" required>
        </div>
        <div class="form-group">
          <label for="deal-description">Description</label>
          <textarea id="deal-description" class="input" rows="2" placeholder="Why is this a good deal for resellers?"></textarea>
        </div>
        <div class="form-group">
          <label for="deal-url">URL</label>
          <input type="url" id="deal-url" class="input" placeholder="https://...">
        </div>
        <div class="form-row form-row-3">
          <div class="form-group">
            <label for="deal-original-price">Original Price</label>
            <input type="number" id="deal-original-price" class="input" step="0.01" min="0" placeholder="$0.00">
          </div>
          <div class="form-group">
            <label for="deal-price">Deal Price *</label>
            <input type="number" id="deal-deal-price" class="input" step="0.01" min="0" placeholder="$0.00" required>
          </div>
          <div class="form-group">
            <label for="deal-end-date">End Date</label>
            <input type="date" id="deal-end-date" class="input">
          </div>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-ghost" id="deal-form-cancel">Cancel</button>
      <button class="btn btn-primary" id="deal-form-submit">Add Deal</button>
    `,
  });

  document.getElementById('deal-form-cancel')?.addEventListener('click', closeModal);
  document.getElementById('deal-form-submit')?.addEventListener('click', async () => {
    const form = document.getElementById('add-deal-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const retailer = document.getElementById('deal-retailer').value;
    const title = document.getElementById('deal-title').value.trim();
    const description = document.getElementById('deal-description').value.trim();
    const url = document.getElementById('deal-url').value.trim();
    const originalPrice = parseFloat(document.getElementById('deal-original-price').value) || null;
    const dealPrice = parseFloat(document.getElementById('deal-deal-price').value) || 0;
    const category = document.getElementById('deal-category').value || null;
    const endDate = document.getElementById('deal-end-date').value || null;

    const payload = {
      retailer,
      title,
      deal_price: dealPrice,
    };
    if (description) payload.description = description;
    if (url) payload.url = url;
    if (originalPrice) payload.original_price = originalPrice;
    if (category) payload.category = category;
    if (endDate) payload.end_date = endDate;

    const submitBtn = document.getElementById('deal-form-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      await createDeal(payload);
      closeModal();
      toast.success('Deal Added', `"${title}" has been submitted.`);
      await loadDeals(content);
    } catch {
      toast.error('Add Failed', 'Could not create the deal. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Deal';
    }
  });
}

function getMostFrequent(arr) {
  const freq = {};
  let maxCount = 0;
  let maxItem = '';
  for (const item of arr) {
    freq[item] = (freq[item] || 0) + 1;
    if (freq[item] > maxCount) {
      maxCount = freq[item];
      maxItem = item;
    }
  }
  return maxItem;
}
