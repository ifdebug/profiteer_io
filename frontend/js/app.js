/**
 * Application entry point — initializes router, theme, and global systems.
 */

import { initRouter } from './router.js';
import { NAV_ITEMS } from './utils/constants.js';

function initTheme() {
  const saved = localStorage.getItem('profiteer-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('profiteer-theme', next);
}

function buildNav() {
  // Sidebar nav
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav) {
    sidebarNav.innerHTML = NAV_ITEMS.map(item => `
      <a class="nav-item" href="${item.route}" data-route="${item.route}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>
    `).join('');
  }

  // Tab bar (mobile)
  const tabBarInner = document.getElementById('tab-bar-inner');
  if (tabBarInner) {
    // Show first 5 items in mobile tab bar
    const mobileItems = NAV_ITEMS.slice(0, 5);
    tabBarInner.innerHTML = mobileItems.map(item => `
      <a class="tab-item" href="${item.route}" data-route="${item.route}">
        <span class="tab-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `).join('');
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Service worker registration failed — non-critical
    });
  }
}

// Make toggleTheme available globally for the settings page
window.profiteer = { toggleTheme };

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildNav();
  registerServiceWorker();
  initRouter();
});
