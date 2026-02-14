/**
 * Notification panel — dropdown from bell icon with live notification list.
 */

import { getNotifications, getUnreadCount, markRead, markAllRead } from '../api/notifications.js';
import { timeAgo } from '../utils/format.js';

const NOTIFICATION_ICONS = {
  price_alert: '💲',
  shipment: '📦',
  arbitrage: '🔄',
  deal: '🏷️',
  hype: '🔥',
  inventory: '📋',
};

let panelOpen = false;
let panelEl = null;
let pollInterval = null;

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Initialize the notification system — badge polling + bell click handler.
 */
export function initNotifications() {
  const bell = document.getElementById('notification-bell');
  if (!bell) return;

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (panelOpen && panelEl && !panelEl.contains(e.target)) {
      closePanel();
    }
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelOpen) closePanel();
  });

  // Initial badge update + start polling
  updateBadge();
  pollInterval = setInterval(updateBadge, 60_000); // Poll every 60s
}

/**
 * Update the badge count.
 */
async function updateBadge() {
  try {
    const data = await getUnreadCount();
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    const count = data.unread_count || 0;
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch {
    // Silently fail — badge polling is non-critical
  }
}

/**
 * Open the notification panel.
 */
async function openPanel() {
  closePanel(); // Clean up any existing panel

  const bell = document.getElementById('notification-bell');
  if (!bell) return;

  panelEl = document.createElement('div');
  panelEl.className = 'notification-panel';
  panelEl.innerHTML = `
    <div class="notification-panel-header">
      <h3>Notifications</h3>
      <div class="notification-panel-actions">
        <button class="btn-link" id="notif-mark-all">Mark all read</button>
        <a href="#/notifications" class="btn-link" id="notif-view-all">View all</a>
      </div>
    </div>
    <div class="notification-panel-body" id="notif-panel-body">
      <div class="notification-panel-loading">Loading...</div>
    </div>
  `;

  bell.parentElement.appendChild(panelEl);
  panelOpen = true;

  // Wire up actions
  panelEl.querySelector('#notif-mark-all')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await markAllRead();
    updateBadge();
    loadPanelNotifications();
  });

  panelEl.querySelector('#notif-view-all')?.addEventListener('click', () => {
    closePanel();
  });

  // Prevent clicks inside panel from closing it
  panelEl.addEventListener('click', (e) => e.stopPropagation());

  await loadPanelNotifications();
}

/**
 * Load notifications into the panel body.
 */
async function loadPanelNotifications() {
  const body = panelEl?.querySelector('#notif-panel-body');
  if (!body) return;

  try {
    const data = await getNotifications({ limit: 10 });
    const notifications = data.notifications || [];

    if (notifications.length === 0) {
      body.innerHTML = `
        <div class="notification-panel-empty">
          <span>🔔</span>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    body.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.read ? '' : 'notification-unread'}" data-id="${n.id}">
        <div class="notification-item-icon">${NOTIFICATION_ICONS[n.type] || '📌'}</div>
        <div class="notification-item-content">
          <div class="notification-item-title">${escapeHtml(n.title)}</div>
          <div class="notification-item-message">${escapeHtml(n.message)}</div>
          <div class="notification-item-time">${timeAgo(n.created_at)}</div>
        </div>
        ${!n.read ? '<div class="notification-item-dot"></div>' : ''}
      </div>
    `).join('');

    // Click handler: mark as read + navigate
    body.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const notif = notifications.find(n => String(n.id) === id);
        if (notif && !notif.read) {
          await markRead(id);
          item.classList.remove('notification-unread');
          item.querySelector('.notification-item-dot')?.remove();
          updateBadge();
        }
        if (notif?.link) {
          closePanel();
          window.location.hash = notif.link;
        }
      });
    });
  } catch {
    body.innerHTML = '<div class="notification-panel-empty"><p>Could not load notifications</p></div>';
  }
}

/**
 * Close the notification panel.
 */
function closePanel() {
  if (panelEl) {
    panelEl.remove();
    panelEl = null;
  }
  panelOpen = false;
}

/**
 * Force a badge refresh (called after creating notifications, etc.)
 */
export function refreshBadge() {
  updateBadge();
}
