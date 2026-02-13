/**
 * Inventory Manager page — full CRUD with summary, filters, and grid layout.
 *
 * Wired to real backend API:
 * - GET    /inventory         → list all items + summary
 * - POST   /inventory         → create new item
 * - PUT    /inventory/:id     → update item
 * - DELETE /inventory/:id     → delete item
 */

import { getInventory, addItem, updateItem, deleteItem } from '../api/inventory.js';
import { skeletonCards } from '../components/skeleton.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { openModal, closeModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

/** Escape HTML entities to prevent XSS in user-provided data. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- State ----
let currentData = null;
let containerRef = null;

export async function init(container) {
  containerRef = container;

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

  await loadInventory(container);
}

// ---- Data loading ----

async function loadInventory(container) {
  let data;
  try {
    data = await getInventory();
  } catch {
    container.querySelector('#inventory-list').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3 class="empty-state-title">Could not load inventory</h3></div>';
    return;
  }

  currentData = data;
  renderSummary(container, data.summary);
  renderItems(container, data.items);
  setupHandlers(container, data);
}

/** Full reload: re-fetch from API and re-render everything. */
async function reloadInventory() {
  if (!containerRef) return;
  const container = containerRef;

  // Show skeleton in list area only (keep summary visible)
  const list = container.querySelector('#inventory-list');
  if (list) list.innerHTML = skeletonCards(4);

  let data;
  try {
    data = await getInventory();
  } catch {
    if (list) list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3 class="empty-state-title">Could not reload inventory</h3></div>';
    return;
  }

  currentData = data;
  renderSummary(container, data.summary);
  renderItems(container, data.items);
  // Re-bind item card handlers (search/filter/add/export handlers remain from initial setup)
  bindItemCardHandlers(container);
}

// ---- Render ----

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
          <div class="inventory-item-card animate-fade-in-up" style="animation-delay: ${i * 30}ms;" data-item-id="${item.id}">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-3);">
              <div style="font-weight: 600; font-size: var(--text-sm);">${escapeHtml(item.name)}</div>
              <span class="badge ${statusClass}">${escapeHtml(item.listing_status)}</span>
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
            ${item.purchase_source ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-top: var(--space-2);">Source: ${escapeHtml(item.purchase_source)}</div>` : ''}
            ${item.purchase_date ? `<div style="font-size: var(--text-xs); color: var(--text-tertiary);">Purchased: ${formatDate(item.purchase_date)}</div>` : ''}
            <div class="inventory-item-actions">
              <button class="btn btn-ghost btn-xs inv-edit-btn" data-id="${item.id}">Edit</button>
              <button class="btn btn-ghost btn-xs btn-danger-text inv-delete-btn" data-id="${item.id}">Delete</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  bindItemCardHandlers(container);
}

// ---- Card action handlers (Edit / Delete) ----

function bindItemCardHandlers(container) {
  // Edit buttons
  container.querySelectorAll('.inv-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id, 10);
      const item = currentData?.items?.find(i => i.id === id);
      if (item) openEditModal(item);
    });
  });

  // Delete buttons
  container.querySelectorAll('.inv-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id, 10);
      const item = currentData?.items?.find(i => i.id === id);
      if (item) openDeleteConfirm(item);
    });
  });
}

// ---- Toolbar handlers (Search / Filter / Add / Export) ----

function setupHandlers(container, data) {
  const searchInput = container.querySelector('#inv-search');
  const statusFilter = container.querySelector('#inv-status-filter');

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderItems(container, currentData.items, searchInput.value, statusFilter.value);
    }, 300);
  });

  statusFilter.addEventListener('change', () => {
    renderItems(container, currentData.items, searchInput.value, statusFilter.value);
  });

  container.querySelector('#add-item-btn').addEventListener('click', () => {
    openAddModal();
  });

  container.querySelector('#export-csv-btn').addEventListener('click', () => {
    exportCsv();
  });
}

// ---- Add Item Modal ----

function openAddModal() {
  openModal({
    title: 'Add Inventory Item',
    content: `
      <div class="form-group">
        <label class="form-label">Item Name *</label>
        <input type="text" class="form-input" id="modal-name" placeholder="e.g., Pokemon Booster Box" required>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
        <div class="form-group">
          <label class="form-label">Purchase Price *</label>
          <input type="number" class="form-input" id="modal-price" placeholder="0.00" step="0.01" min="0" required>
        </div>
        <div class="form-group">
          <label class="form-label">Current Value</label>
          <input type="number" class="form-input" id="modal-value" placeholder="0.00" step="0.01" min="0">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input type="number" class="form-input" id="modal-qty" value="1" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Condition</label>
          <select class="form-select" id="modal-condition">
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="used">Used</option>
            <option value="for_parts">For Parts</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Purchase Source</label>
        <input type="text" class="form-input" id="modal-source" placeholder="e.g., Target, eBay">
      </div>
      <div class="form-group">
        <label class="form-label">Purchase Date</label>
        <input type="date" class="form-input" id="modal-date">
      </div>
      <div class="form-group">
        <label class="form-label">Storage Location</label>
        <input type="text" class="form-input" id="modal-storage" placeholder="e.g., Shelf A, Binder 3">
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="modal-notes" rows="2" placeholder="Any extra details..."></textarea>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save">Add Item</button>
    `,
  });

  setTimeout(() => {
    // Cancel button
    const cancelBtn = document.querySelector('.modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Save button
    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('modal-name')?.value?.trim();
        const price = parseFloat(document.getElementById('modal-price')?.value);

        if (!name) {
          toast.error('Validation', 'Item name is required.');
          return;
        }
        if (isNaN(price) || price < 0) {
          toast.error('Validation', 'Enter a valid purchase price.');
          return;
        }

        const payload = {
          name,
          purchase_price: price,
          current_value: parseFloat(document.getElementById('modal-value')?.value) || null,
          quantity: parseInt(document.getElementById('modal-qty')?.value, 10) || 1,
          condition: document.getElementById('modal-condition')?.value || 'new',
          purchase_source: document.getElementById('modal-source')?.value?.trim() || null,
          purchase_date: document.getElementById('modal-date')?.value || null,
          storage_location: document.getElementById('modal-storage')?.value?.trim() || null,
          notes: document.getElementById('modal-notes')?.value?.trim() || null,
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Adding...';

        try {
          await addItem(payload);
          closeModal();
          toast.success('Item Added', `"${name}" has been added to your inventory.`);
          await reloadInventory();
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Add Item';
          // toast.error already fired by API client
        }
      });
    }
  }, 50);
}

// ---- Edit Item Modal ----

function openEditModal(item) {
  openModal({
    title: 'Edit Inventory Item',
    content: `
      <div class="form-group">
        <label class="form-label">Item Name *</label>
        <input type="text" class="form-input" id="modal-name" value="${escapeHtml(item.name)}" required>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
        <div class="form-group">
          <label class="form-label">Purchase Price *</label>
          <input type="number" class="form-input" id="modal-price" value="${item.purchase_price}" step="0.01" min="0" required>
        </div>
        <div class="form-group">
          <label class="form-label">Current Value</label>
          <input type="number" class="form-input" id="modal-value" value="${item.current_value ?? ''}" step="0.01" min="0">
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
        <div class="form-group">
          <label class="form-label">Quantity</label>
          <input type="number" class="form-input" id="modal-qty" value="${item.quantity}" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Condition</label>
          <select class="form-select" id="modal-condition">
            <option value="new" ${item.condition === 'new' ? 'selected' : ''}>New</option>
            <option value="like_new" ${item.condition === 'like_new' ? 'selected' : ''}>Like New</option>
            <option value="used" ${item.condition === 'used' ? 'selected' : ''}>Used</option>
            <option value="for_parts" ${item.condition === 'for_parts' ? 'selected' : ''}>For Parts</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Listing Status</label>
        <select class="form-select" id="modal-status">
          <option value="unlisted" ${item.listing_status === 'unlisted' ? 'selected' : ''}>Unlisted</option>
          <option value="listed" ${item.listing_status === 'listed' ? 'selected' : ''}>Listed</option>
          <option value="sold" ${item.listing_status === 'sold' ? 'selected' : ''}>Sold</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Purchase Source</label>
        <input type="text" class="form-input" id="modal-source" value="${escapeHtml(item.purchase_source || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Purchase Date</label>
        <input type="date" class="form-input" id="modal-date" value="${item.purchase_date || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Storage Location</label>
        <input type="text" class="form-input" id="modal-storage" value="${escapeHtml(item.storage_location || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-input" id="modal-notes" rows="2">${escapeHtml(item.notes || '')}</textarea>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save">Save Changes</button>
    `,
  });

  setTimeout(() => {
    const cancelBtn = document.querySelector('.modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('modal-name')?.value?.trim();
        const price = parseFloat(document.getElementById('modal-price')?.value);

        if (!name) {
          toast.error('Validation', 'Item name is required.');
          return;
        }
        if (isNaN(price) || price < 0) {
          toast.error('Validation', 'Enter a valid purchase price.');
          return;
        }

        const payload = {
          name,
          purchase_price: price,
          current_value: parseFloat(document.getElementById('modal-value')?.value) || null,
          quantity: parseInt(document.getElementById('modal-qty')?.value, 10) || 1,
          condition: document.getElementById('modal-condition')?.value || 'new',
          listing_status: document.getElementById('modal-status')?.value || 'unlisted',
          purchase_source: document.getElementById('modal-source')?.value?.trim() || null,
          purchase_date: document.getElementById('modal-date')?.value || null,
          storage_location: document.getElementById('modal-storage')?.value?.trim() || null,
          notes: document.getElementById('modal-notes')?.value?.trim() || null,
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
          await updateItem(item.id, payload);
          closeModal();
          toast.success('Item Updated', `"${name}" has been updated.`);
          await reloadInventory();
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      });
    }
  }, 50);
}

// ---- Delete Confirmation Modal ----

function openDeleteConfirm(item) {
  openModal({
    title: 'Delete Item',
    content: `
      <p style="margin-bottom: var(--space-2);">Are you sure you want to delete <strong>${escapeHtml(item.name)}</strong>?</p>
      <p style="color: var(--text-tertiary); font-size: var(--text-sm);">This action cannot be undone.</p>
    `,
    footer: `
      <button class="btn btn-ghost modal-cancel-btn">Cancel</button>
      <button class="btn btn-danger" id="modal-confirm-delete">Delete</button>
    `,
  });

  setTimeout(() => {
    const cancelBtn = document.querySelector('.modal-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const deleteBtn = document.getElementById('modal-confirm-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';

        try {
          await deleteItem(item.id);
          closeModal();
          toast.success('Item Deleted', `"${item.name}" has been removed.`);
          await reloadInventory();
        } catch (err) {
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete';
        }
      });
    }
  }, 50);
}

// ---- CSV Export ----

function exportCsv() {
  if (!currentData || !currentData.items || currentData.items.length === 0) {
    toast.info('Export', 'No items to export.');
    return;
  }

  const headers = ['Name', 'Purchase Price', 'Current Value', 'P/L', 'Quantity', 'Condition', 'Status', 'Source', 'Date', 'Location', 'Notes'];
  const rows = currentData.items.map(item => [
    `"${(item.name || '').replace(/"/g, '""')}"`,
    item.purchase_price,
    item.current_value ?? '',
    item.profit_loss ?? '',
    item.quantity,
    item.condition,
    item.listing_status,
    `"${(item.purchase_source || '').replace(/"/g, '""')}"`,
    item.purchase_date || '',
    `"${(item.storage_location || '').replace(/"/g, '""')}"`,
    `"${(item.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `profiteer_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success('Exported', 'Inventory exported as CSV.');
}
