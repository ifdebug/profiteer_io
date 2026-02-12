/**
 * Shipment Tracker page — list of shipments with status and timeline detail.
 */

import { getShipments } from '../api/tracking.js';
import { skeletonCards } from '../components/skeleton.js';
import { formatDateTime } from '../utils/format.js';

export async function init(container) {
  container.innerHTML = `<div class="page-container"><div class="page-header"><h2>Shipment Tracker</h2><p>Track all your packages in one place</p></div><div id="shipments-content">${skeletonCards(4)}</div></div>`;

  let data;
  try {
    data = await getShipments();
  } catch {
    container.querySelector('#shipments-content').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><h3 class="empty-state-title">Could not load shipments</h3></div>';
    return;
  }

  const statusIcons = {
    label_created: '🏷️', accepted: '📦', in_transit: '🚚',
    out_for_delivery: '📬', delivered: '✅', exception: '⚠️',
  };
  const statusColors = {
    label_created: 'var(--text-tertiary)', in_transit: 'var(--action)',
    out_for_delivery: 'var(--warning)', delivered: 'var(--profit)', exception: 'var(--loss)',
  };

  const content = container.querySelector('#shipments-content');
  content.innerHTML = `
    <!-- Summary -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); margin-bottom: var(--space-6);">
      <div class="card stat-card" style="text-align: center;">
        <div class="stat-value financial">${data.summary.total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="card stat-card" style="text-align: center;">
        <div class="stat-value financial" style="color: var(--action);">${data.summary.in_transit}</div>
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
          <div class="shipment-status-icon" style="background: ${statusColors[s.status]}20; color: ${statusColors[s.status]};">
            ${statusIcons[s.status] || '📦'}
          </div>
          <div class="shipment-info">
            <div class="shipment-tracking">${s.tracking_number}</div>
            <div class="shipment-route">${s.carrier} · ${s.origin || '—'} → ${s.destination || '—'}</div>
          </div>
          <span class="badge badge-${s.status === 'delivered' ? 'profit' : s.status === 'exception' ? 'loss' : s.status === 'out_for_delivery' ? 'warning' : 'info'}">
            ${(statusIcons[s.status] || '') + ' ' + s.status.replace(/_/g, ' ')}
          </span>
        </div>
      `).join('')}
    </div>

    <div id="shipment-detail" style="margin-top: var(--space-6);"></div>
  `;

  // Click to show timeline
  content.querySelectorAll('.shipment-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const shipment = data.shipments.find(s => s.id === id);
      if (!shipment) return;

      const detail = content.querySelector('#shipment-detail');
      detail.innerHTML = `
        <div class="card animate-fade-in-up">
          <div class="card-header">
            <span class="card-title">Tracking Timeline — ${shipment.tracking_number}</span>
          </div>
          <div class="shipment-timeline">
            ${(shipment.events || []).map((ev, i) => `
              <div class="timeline-event">
                <div class="timeline-dot" ${i === 0 ? 'style="border-color: var(--action); background: var(--action-bg);"' : ''}></div>
                <div class="timeline-content">
                  <div class="timeline-status">${ev.description}</div>
                  <div class="timeline-detail">${ev.location || ''} · ${formatDateTime(ev.timestamp)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
