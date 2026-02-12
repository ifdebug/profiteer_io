/**
 * Hash-based SPA router for Profiteer.io.
 * Maps hash routes to page modules with dynamic imports and page transitions.
 */

const routes = {
  '/': () => import('./pages/dashboard.js'),
  '/analyzer': () => import('./pages/analyzer.js'),
  '/trends': () => import('./pages/trends.js'),
  '/shipments': () => import('./pages/shipments.js'),
  '/arbitrage': () => import('./pages/arbitrage.js'),
  '/inventory': () => import('./pages/inventory.js'),
  '/deals': () => import('./pages/deals.js'),
  '/hype': () => import('./pages/hype.js'),
  '/settings': () => import('./pages/settings.js'),
};

const pageTitles = {
  '/': 'Dashboard',
  '/analyzer': 'Profitability Analyzer',
  '/trends': 'Price Trends',
  '/shipments': 'Shipment Tracker',
  '/arbitrage': 'Arbitrage Finder',
  '/inventory': 'Inventory Manager',
  '/deals': 'Deals & Coupons',
  '/hype': 'Hype Analyzer',
  '/settings': 'Settings',
};

let currentPage = null;

function getRoutePath() {
  const hash = window.location.hash || '#/';
  return hash.slice(1) || '/';
}

function getBaseRoute(path) {
  // Extract the base route (e.g., /hype/1 -> /hype)
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? '/' + parts[0] : '/';
}

function updateActiveNav(path) {
  const baseRoute = getBaseRoute(path);
  const hash = '#' + baseRoute;

  document.querySelectorAll('.nav-item, .tab-item').forEach(item => {
    const itemRoute = item.getAttribute('data-route');
    if (itemRoute === '#/' && baseRoute === '/') {
      item.classList.add('active');
    } else if (itemRoute !== '#/' && hash === itemRoute) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Highlight "More" button if a child page is active
  const moreBtn = document.getElementById('tab-more');
  if (moreBtn) {
    const hasActiveChild = moreBtn.querySelector('.tab-more-item.active');
    moreBtn.classList.toggle('active', !!hasActiveChild);
  }
}

function updatePageTitle(path) {
  const baseRoute = getBaseRoute(path);
  const title = pageTitles[baseRoute] || 'Profiteer.io';
  document.title = title + ' — Profiteer.io';

  const headerTitle = document.getElementById('header-title');
  if (headerTitle) {
    headerTitle.textContent = title;
  }
}

async function navigate(path) {
  const baseRoute = getBaseRoute(path);
  const loader = routes[baseRoute];
  if (!loader) {
    window.location.hash = '#/';
    return;
  }

  const app = document.getElementById('app');

  // Fade out current content
  if (currentPage) {
    app.style.opacity = '0';
    app.style.transform = 'translateY(8px)';
    await new Promise(r => setTimeout(r, 150));
  }

  // Load the page module
  try {
    const module = await loader();
    app.innerHTML = '';
    await module.init(app, path);
    currentPage = baseRoute;
  } catch (err) {
    console.error('Failed to load page:', err);
    app.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3 class="empty-state-title">Failed to load page</h3>
          <p class="empty-state-description">Something went wrong. Please try again.</p>
          <a href="#/" class="btn btn-primary">Go to Dashboard</a>
        </div>
      </div>
    `;
  }

  // Fade in new content
  app.style.transition = 'opacity 250ms ease, transform 250ms ease';
  app.style.opacity = '1';
  app.style.transform = 'translateY(0)';

  updateActiveNav(path);
  updatePageTitle(path);
  window.scrollTo(0, 0);
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    navigate(getRoutePath());
  });

  // Initial route
  navigate(getRoutePath());
}
