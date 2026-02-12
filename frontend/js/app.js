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

  // Tab bar (mobile) — first 4 items + "More" menu for the rest
  const tabBarInner = document.getElementById('tab-bar-inner');
  if (tabBarInner) {
    const primaryItems = NAV_ITEMS.slice(0, 4);
    const moreItems = NAV_ITEMS.slice(4);

    tabBarInner.innerHTML = primaryItems.map(item => `
      <a class="tab-item" href="${item.route}" data-route="${item.route}">
        <span class="tab-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `).join('') + `
      <div class="tab-item tab-more" id="tab-more" role="button" tabindex="0" aria-label="More pages">
        <span class="tab-icon">•••</span>
        <span>More</span>
        <div class="tab-more-menu" id="tab-more-menu">
          ${moreItems.map(item => `
            <a class="tab-more-item tab-item" href="${item.route}" data-route="${item.route}">
              <span class="tab-icon">${item.icon}</span>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;

    // Toggle "More" menu
    const moreBtn = document.getElementById('tab-more');
    const moreMenu = document.getElementById('tab-more-menu');
    moreBtn.addEventListener('click', (e) => {
      // Don't toggle if they clicked a link inside the menu
      if (e.target.closest('.tab-more-item')) return;
      moreMenu.classList.toggle('open');
    });

    // Close menu when a link inside is clicked
    moreMenu.querySelectorAll('.tab-more-item').forEach(item => {
      item.addEventListener('click', () => {
        moreMenu.classList.remove('open');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!moreBtn.contains(e.target)) {
        moreMenu.classList.remove('open');
      }
    });
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
