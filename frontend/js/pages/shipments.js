/**
 * Shipment Tracker page — list shipments with status timeline, add/delete/refresh.
 */

import { getShipments, addShipment, deleteShipment, refreshShipment } from '../api/tracking.js';
import { skeletonCards } from '../components/skeleton.js';
import { toast } from '../components/toast.js';
import { formatDateTime } from '../utils/format.js';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const statusIcons = {
  label_created: '🏷️', accepted: '📦', in_transit: '🚚',
  out_for_delivery: '📬', delivered: '✅', exception: '⚠️',
};
const statusColors = {
  label_created: 'var(--text-tertiary)', in_transit: 'var(--action)',
  out_for_delivery: 'var(--warning)', delivered: 'var(--profit)', exception: 'var(--loss)',
};

let containerRef = null;

export async function init(container) {
  containerRef = container;
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <h2>Shipment Tracker</h2>
          <p>Track all your packages in one place</p>
        </div>
        <button class="btn btn-primary" id="add-shipment-btn">+ Add Tracking</button>
      </div>

      <!-- Add Shipment Form (hidden by default) -->
      <div id="add-shipment-form" class="card shipment-add-form" style="display: none;">
        <div class="card-header">
          <span class="card-title">Add Tracking Number</span>
          <button class="btn btn-ghost btn-sm" id="cancel-add-btn">✕</button>
        </div>
        <div style="padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);">
          <div class="shipment-form-row">
            <div style="flex: 1;">
              <label class="form-label">Tracking Number</label>
              <input type="text" class="form-input" id="tracking-input" placeholder="e.g., 9400111899223456789012" />
            </div>
            <div>
              <label class="form-label">Carrier</label>
              <select class="form-input" id="carrier-select">
                <option value="auto">Auto-detect</option>
                <option value="USPS">USPS</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="DHL">DHL</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div class="shipment-form-row">
            <div style="flex: 1;">
              <label class="form-label">Origin (optional)</label>
              <input type="text" class="form-input" id="origin-input" placeholder="e.g., Denver, CO" />
            </div>
            <div style="flex: 1;">
              <label class="form-label">Destination (optional)</label>
              <input type="text" class="form-input" id="destination-input" placeholder="e.g., Los Angeles, CA" />
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: var(--space-2);">
            <button class="btn btn-ghost" id="cancel-add-btn-2">Cancel</button>
            <button class="btn btn-primary" id="submit-shipment-btn">Add Shipment</button>
          </div>
        </div>
      </div>

      <div id="shipments-content">${skeletonCards(4)}</div>
    </div>
  `;

  // Wire up add form toggle
  const addBtn = container.querySelector('#add-shipment-btn');
  const addForm = container.querySelector('#add-shipment-form');
  const cancelBtn = container.querySelector('#cancel-add-btn');
  const cancelBtn2 = container.querySelector('#cancel-add-btn-2');
  const submitBtn = container.querySelector('#submit-shipment-btn');

  addBtn.addEventListener('click', () => {
    addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
    if (addForm.style.display === 'block') {
      container.querySelector('#tracking-input').focus();
    }
  });
  cancelBtn.addEventListener('click', () => { addForm.style.display = 'none'; });
  cancelBtn2.addEventListener('click', () => { addForm.style.display = 'none'; });

  submitBtn.addEventListener('click', () => handleAddShipment(container));
  container.querySelector('#tracking-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddShipment(container);
  });

  await loadShipments(container);
}

async function handleAddShipment(container) {
  const trackingInput = container.querySelector('#tracking-input');
  const carrierSelect = container.querySelector('#carrier-select');
  const originInput = container.querySelector('#origin-input');
  const destInput = container.querySelector('#destination-input');
  const submitBtn = container.querySelector('#submit-shipment-btn');

  const tracking = trackingInput.value.trim();
  if (!tracking) {
    toast.warning('Please enter a tracking number');
    trackingInput.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding...';

  try {
    const carrier = carrierSelect.value === 'auto' ? null : carrierSelect.value;
    await addShipment({
      tracking_number: tracking,
      carrier,
      origin: originInput.value.trim() || null,
      destination: destInput.value.trim() || null,
    });

    toast.success('Shipment added successfully');

    // Reset form
    trackingInput.value = '';
    carrierSelect.value = 'auto';
    originInput.value = '';
    destInput.value = '';
    container.querySelector('#add-shipment-form').style.display = 'none';

    // Reload list
    await loadShipments(container);
  } catch (err) {
    toast.error('Failed to add shipment');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Shipment';
  }
}

async function loadShipments(container) {
  const content = container.querySelector('#shipments-content');
  if (!content) return;

  let data;
  try {
    data = await getShipments();
  } catch {
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><h3 class="empty-state-title">Could not load shipments</h3><button class="btn btn-primary" id="retry-btn">Retry</button></div>';
    content.querySelector('#retry-btn')?.addEventListener('click', () => loadShipments(container));
    return;
  }

  if (!data.shipments || data.shipments.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3 class="empty-state-title">No shipments yet</h3>
        <p class="empty-state-subtitle">Click "+ Add Tracking" to start tracking a package</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <!-- Summary -->
    <div class="grid grid-4" style="margin-bottom: var(--space-6);">
      <div class="card stat-card" style="text-align: center;">
        <div class="stat-value financial">${data.summary.total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="card stat-card" style="text-align: center;">
        <div class="stat-value financial" style="color: var(--action);">${data.summary.in_transit + (data.summary.label_created || 0)}</div>
        <div class="stat-label">In Transit</div>
      </div>
      <div class="card stat-card" style="text-align: center;">
        <div class="stat-value financial" style="color: var(--profit);">${data.summary.delivered}</div>
        <div class="stat-label">Delivered</div>
      </div>
      <div class="card stat-card" style="text-align: center;">
        <div class="stat-value financial" style="color: var(--loss);">${data.summary.exception}</div>
        <div class="stat-label">Exceptions</div>
      </div>
    </div>

    <!-- Shipment List -->
    <div class="shipment-list">
      ${data.shipments.map(s => `
        <div class="shipment-card" data-id="${s.id}">
          <div class="shipment-status-icon" style="background: ${statusColors[s.status] || 'var(--text-tertiary)'}20; color: ${statusColors[s.status] || 'var(--text-tertiary)'};">
            ${statusIcons[s.status] || '📦'}
          </div>
          <div class="shipment-info">
            <div class="shipment-tracking">${escapeHtml(s.tracking_number)}</div>
            <div class="shipment-route">${escapeHtml(s.carrier)} · ${escapeHtml(s.origin || '—')} → ${escapeHtml(s.destination || '—')}</div>
          </div>
          <div class="shipment-actions">
            <button class="btn btn-ghost btn-sm refresh-btn" data-id="${s.id}" title="Refresh tracking">🔄</button>
            <button class="btn btn-ghost btn-sm delete-btn" data-id="${s.id}" title="Delete shipment">🗑️</button>
          </div>
          <span class="badge badge-${s.status === 'delivered' ? 'profit' : s.status === 'exception' ? 'loss' : s.status === 'out_for_delivery' ? 'warning' : 'info'}">
            ${(statusIcons[s.status] || '') + ' ' + s.status.replace(/_/g, ' ')}
          </span>
        </div>
      `).join('')}
    </div>

    <div id="shipment-detail" style="margin-top: var(--space-6);"></div>
  `;

  // Click card to show timeline
  content.querySelectorAll('.shipment-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking action buttons
      if (e.target.closest('.refresh-btn') || e.target.closest('.delete-btn')) return;

      const id = parseInt(card.dataset.id);
      const shipment = data.shipments.find(s => s.id === id);
      if (!shipment) return;

      // Highlight selected card
      content.querySelectorAll('.shipment-card').forEach(c => c.classList.remove('shipment-card-active'));
      card.classList.add('shipment-card-active');

      const detail = content.querySelector('#shipment-detail');
      const events = shipment.events || [];
      detail.innerHTML = `
        <div class="card animate-fade-in-up">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <span class="card-title">Tracking Timeline — ${escapeHtml(shipment.tracking_number)}</span>
            <span class="badge badge-${shipment.status === 'delivered' ? 'profit' : shipment.status === 'exception' ? 'loss' : 'info'}">${shipment.status.replace(/_/g, ' ')}</span>
          </div>
          ${events.length > 0 ? `
            <div class="shipment-timeline">
              ${events.map((ev, i) => `
                <div class="timeline-event">
                  <div class="timeline-dot" ${i === 0 ? 'style="border-color: var(--action); background: var(--action-bg);"' : ''}></div>
                  <div class="timeline-content">
                    <div class="timeline-status">${escapeHtml(ev.description)}</div>
                    <div class="timeline-detail">${escapeHtml(ev.location || '')}${ev.location && ev.timestamp ? ' · ' : ''}${ev.timestamp ? formatDateTime(ev.timestamp) : ''}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div style="padding: var(--space-5); text-align: center; color: var(--text-tertiary);">
              <p>No tracking events yet. Click 🔄 to refresh tracking data.</p>
            </div>
          `}
        </div>
      `;
      detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Refresh buttons
  content.querySelectorAll('.refresh-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      btn.disabled = true;
      btn.textContent = '⏳';
      try {
        await refreshShipment(id);
        toast.success('Tracking data refreshed');
        await loadShipments(container);
      } catch {
        toast.error('Failed to refresh tracking');
      } finally {
        btn.disabled = false;
        btn.textContent = '🔄';
      }
    });
  });

  // Delete buttons
  content.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (!confirm('Delete this shipment?')) return;
      btn.disabled = true;
      try {
        await deleteShipment(id);
        toast.success('Shipment deleted');
        await loadShipments(container);
      } catch {
        toast.error('Failed to delete shipment');
      }
    });
  });
}
