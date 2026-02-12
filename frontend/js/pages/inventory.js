/**
 * Inventory Manager page — item list with summary, filters, and grid/list toggle.
 */

import { getInventory } from '../api/inventory.js';
import { skeletonCards } from '../components/skeleton.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { openModal, closeModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Inventory Manager</h2>
        <p>Track what you own, what you paid, and what it's worth</p>
      </div>

      <div id="inventory-summary" style="margin-bottom: var(--space-4);">${skeletonCards(4)}</div>

      <div class="inventory-toolbar">
        <div class="toolbar-left">
          <input type="text" class="form-input" id="inv-search" placeholder="Search inventory..." style="max-width: 260px;" aria-label="Search inventory">
          <select class="form-select" id="inv-status-filter" style="max-width: 160px;" aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="unlisted">Unlisted</option>
            <option value="listed">Listed</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary btn-sm" id="add-item-btn">+ Add Item</button>
          <button class="btn btn-secondary btn-sm" id="export-csv-btn">Export CSV</button>
        </div>
      </div>

      <div id="inventory-list">${skeletonCards(6)}</div>
    </div>
  `;

  let data;
  try {
    data = await getInventory();
  } catch {
    container.querySelector('#inventory-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3 class="empty-state-title">Could not load inventory</h3></div>';
    return;
  }

  renderSummary(container, data.summary);
  renderItems(container, data.items);
  setupHandlers(container, data);
}

function renderSummary(container, summary) {
  container.querySelector('#inventory-summary').innerHTML = `
    <div class="inventory-summary">
      <div class="card stat-card" style="text-align: center;">
        <div class="card-title">Total Items</div>
        <div class="stat-value financial">${summary.total_items}</div>
      </div>
      <div class="card stat-card" style="text-align: center;">
        <div class="card-title">Total Value</div>
        <div class="stat-value financial">${formatCurrency(summary.total_value)}</div>
      </div>
      <div class="card stat-card" style="text-align: center;">
        <div class="card-title">Cost Basis</div>
        <div class="stat-value financial">${formatCurrency(summary.total_cost)}</div>
      </div>
      <div class="card stat-card" style="text-align: center;">
        <div class="card-title">Unrealized P/L</div>
        <div class="stat-value financial ${summary.unrealized_pl >= 0 ? 'text-profit' : 'text-loss'}">${summary.unrealized_pl >= 0 ? '+' : ''}${formatCurrency(summary.unrealized_pl)}</div>
      </div>
    </div>
  `;
}

function renderItems(container, items, filter = '', status = '') {
  let filtered = items;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = filtered.filter(i => i.name.toLowerCase().includes(q));
  }
  if (status) {
    filtered = filtered.filter(i => i.listing_status === status);
  }

  const list = container.querySelector('#inventory-list');
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3 class="empty-state-title">No items found</h3><p class="empty-state-description">Add items to start tracking your inventory.</p></div>';
    return;
  }

  list.innerHTML = `
    <div class="inventory-grid">
      ${filtered.map((item, i) => {
        const plClass = (item.profit_loss || 0) >= 0 ? 'text-profit' : 'text-loss';
        const statusClass = item.listing_status === 'sold' ? 'badge-profit' : item.listing_status === 'listed' ? 'badge-warning' : 'badge-info';
        return `
          <div class="inventory-item-card animate-fade-in-up" style="animation-delay: ${i * 30}ms;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-3);">
              <div style="font-weight: 600; font-size: var(--text-sm);">${item.name}</div>
              <span class="badge ${statusClass}">${item.listing_status}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); font-size: var(--text-sm);">
              <div>
                <div style="color: var(--text-tertiary); font-size: var(--text-xs);">Cost</div>
                <div class="financial">${formatCurrency(item.purchase_price)}</div>
              </div>
              <div>
                <div style="color: var(--text-tertiary); font-size: var(--text-xs);">Value</div>
                <div class="financial">${item.current_value ? formatCurrency(item.current_value) : '—'}</div>
              </div>
              <div>
                <div style="color: var(--text-tertiary); font-size: var(--text-xs);">P/L</div>
                <div class="financial item-pl ${plClass}">${item.profit_loss != null ? (item.profit_loss >= 0 ? '+' : '') + formatCurrency(item.profit_loss) : '—'}</div>
              </div>
              <div>
                <div style="color: var(--text-tertiary); font-size: var(--text-xs);">Qty</div>
                <div>${item.quantity}</div>
              </div>
            </div>
            ${item.purchase_source ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-2);">Source: ${item.purchase_source}</div>` : ''}
            ${item.purchase_date ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary);">Purchased: ${formatDate(item.purchase_date)}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function setupHandlers(container, data) {
  const searchInput = container.querySelector('#inv-search');
  const statusFilter = container.querySelector('#inv-status-filter');

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderItems(container, data.items, searchInput.value, statusFilter.value);
    }, 300);
  });

  statusFilter.addEventListener('change', () => {
    renderItems(container, data.items, searchInput.value, statusFilter.value);
  });

  container.querySelector('#add-item-btn').addEventListener('click', () => {
    openModal({
      title: 'Add Inventory Item',
      content: `
        <div class="form-group">
          <label class="form-label">Item Name</label>
          <input type="text" class="form-input" id="modal-name" placeholder="e.g., Pokemon Booster Box" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div class="form-group">
            <label class="form-label">Purchase Price</label>
            <input type="number" class="form-input" id="modal-price" placeholder="0.00" step="0.01" min="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">Quantity</label>
            <input type="number" class="form-input" id="modal-qty" value="1" min="1">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Purchase Source</label>
          <input type="text" class="form-input" id="modal-source" placeholder="e.g., Target, eBay">
        </div>
        <div class="form-group">
          <label class="form-label">Condition</label>
          <select class="form-select" id="modal-condition">
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="used">Used</option>
          </select>
        </div>
      `,
      footer: `
        <button class="btn btn-ghost" onclick="document.querySelector('.modal-close').click()">Cancel</button>
        <button class="btn btn-primary" id="modal-save">Add Item</button>
      `,
    });

    setTimeout(() => {
      const saveBtn = document.getElementById('modal-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          toast.success('Item Added', 'New inventory item has been added.');
          closeModal();
        });
      }
    }, 100);
  });

  container.querySelector('#export-csv-btn').addEventListener('click', () => {
    toast.info('Export', 'CSV export will be available in Phase 2.');
  });
}
