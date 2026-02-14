/**
 * Notifications page — full list with filters, mark read, and delete.
 */

import { getNotifications, markRead, markAllRead, deleteNotification, deleteAllRead } from '../api/notifications.js';
import { skeletonCards } from '../components/skeleton.js';
import { toast } from '../components/toast.js';
import { timeAgo, formatDateTime } from '../utils/format.js';
import { refreshBadge } from '../components/notificationPanel.js';

const NOTIFICATION_ICONS = {
  price_alert: '💲',
  shipment: '📦',
  arbitrage: '🔄',
  deal: '🏷️',
  hype: '🔥',
  inventory: '📋',
};

const TYPE_LABELS = {
  price_alert: 'Price Alert',
  shipment: 'Shipment',
  arbitrage: 'Arbitrage',
  deal: 'Deal',
  hype: 'Hype',
  inventory: 'Inventory',
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let currentFilter = 'all'; // all | unread

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3);">
        <div>
          <h2>Notifications</h2>
          <p>Stay updated on price changes, shipments, and opportunities</p>
        </div>
        <div class="notif-page-actions">
          <button class="btn btn-ghost" id="notif-mark-all-btn">✓ Mark All Read</button>
          <button class="btn btn-ghost" id="notif-clear-read-btn">🗑 Clear Read</button>
        </div>
      </div>

      <div class="notif-filters" id="notif-filters">
        <button class="chip active" data-filter="all">All</button>
        <button class="chip" data-filter="unread">Unread</button>
      </div>

      <div id="notif-content">${skeletonCards(4)}</div>
    </div>
  `;

  const content = container.querySelector('#notif-content');
  const filters = container.querySelector('#notif-filters');

  // Filter clicks
  filters.addEventListener('click', (e) => {
    if (!e.target.classList.contains('chip')) return;
    filters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    loadNotifications(content);
  });

  // Mark all read
  container.querySelector('#notif-mark-all-btn')?.addEventListener('click', async () => {
    try {
      const result = await markAllRead();
      toast.success('All Read', result.message || 'All notifications marked as read.');
      refreshBadge();
      await loadNotifications(content);
    } catch {
      toast.error('Failed', 'Could not mark notifications as read.');
    }
  });

  // Clear read
  container.querySelector('#notif-clear-read-btn')?.addEventListener('click', async () => {
    try {
      const result = await deleteAllRead();
      toast.success('Cleared', result.message || 'Read notifications cleared.');
      refreshBadge();
      await loadNotifications(content);
    } catch {
      toast.error('Failed', 'Could not clear read notifications.');
    }
  });

  await loadNotifications(content);
}

async function loadNotifications(content) {
  content.innerHTML = skeletonCards(4);

  const params = { limit: 100 };
  if (currentFilter === 'unread') params.unread_only = true;

  let data;
  try {
    data = await getNotifications(params);
  } catch {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <h3 class="empty-state-title">Could not load notifications</h3>
        <p class="empty-state-description">Check your connection and try again.</p>
      </div>`;
    return;
  }

  const notifications = data.notifications || [];

  if (notifications.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <h3 class="empty-state-title">${currentFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
        <p class="empty-state-description">${currentFilter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here when alerts trigger.'}</p>
      </div>`;
    return;
  }

  // Summary
  const unread = data.unread_count || 0;
  const total = data.total || notifications.length;

  content.innerHTML = `
    <div class="notif-summary">
      <span class="notif-summary-count">${total} notification${total !== 1 ? 's' : ''}</span>
      ${unread > 0 ? `<span class="notif-summary-unread">${unread} unread</span>` : '<span class="notif-summary-clear">All caught up ✓</span>'}
    </div>
    <div class="notif-list" id="notif-list"></div>
  `;

  const list = content.querySelector('#notif-list');
  renderNotifications(list, notifications, content);
}

function renderNotifications(list, notifications, content) {
  list.innerHTML = notifications.map((n, i) => `
    <div class="notif-row ${n.read ? '' : 'notif-row-unread'} animate-fade-in-up" style="animation-delay: ${i * 30}ms;" data-id="${n.id}">
      <div class="notif-row-icon">${NOTIFICATION_ICONS[n.type] || '📌'}</div>
      <div class="notif-row-body">
        <div class="notif-row-header">
          <span class="notif-row-title">${escapeHtml(n.title)}</span>
          <span class="badge badge-info notif-row-type">${TYPE_LABELS[n.type] || n.type}</span>
        </div>
        <div class="notif-row-message">${escapeHtml(n.message)}</div>
        <div class="notif-row-meta">
          <span class="notif-row-time" title="${n.created_at ? formatDateTime(n.created_at) : ''}">${timeAgo(n.created_at)}</span>
          ${n.link ? `<a href="${escapeHtml(n.link)}" class="notif-row-link">View →</a>` : ''}
        </div>
      </div>
      <div class="notif-row-actions">
        ${!n.read ? `<button class="btn-icon notif-read-btn" data-id="${n.id}" title="Mark as read">✓</button>` : ''}
        <button class="btn-icon notif-delete-btn" data-id="${n.id}" title="Delete">&times;</button>
      </div>
    </div>
  `).join('');

  // Mark read handlers
  list.querySelectorAll('.notif-read-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      try {
        await markRead(id);
        const row = btn.closest('.notif-row');
        row.classList.remove('notif-row-unread');
        btn.remove();
        refreshBadge();
      } catch {
        toast.error('Failed', 'Could not mark notification as read.');
      }
    });
  });

  // Delete handlers
  list.querySelectorAll('.notif-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const row = btn.closest('.notif-row');
      try {
        await deleteNotification(id);
        row.style.transition = 'opacity 0.3s, transform 0.3s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(20px)';
        setTimeout(() => {
          row.remove();
          refreshBadge();
          // Update summary count or reload if empty
          const remaining = list.querySelectorAll('.notif-row').length;
          if (remaining === 0) {
            loadNotifications(content);
          } else {
            const countEl = content.querySelector('.notif-summary-count');
            if (countEl) countEl.textContent = `${remaining} notification${remaining !== 1 ? 's' : ''}`;
          }
        }, 300);
      } catch {
        toast.error('Failed', 'Could not delete notification.');
      }
    });
  });

  // Row click — navigate
  list.querySelectorAll('.notif-row').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', async () => {
      const id = row.dataset.id;
      const notif = notifications.find(n => String(n.id) === id);
      if (notif && !notif.read) {
        await markRead(id);
        row.classList.remove('notif-row-unread');
        row.querySelector('.notif-read-btn')?.remove();
        refreshBadge();
      }
      if (notif?.link) {
        window.location.hash = notif.link;
      }
    });
  });
}
