/**
 * Settings page — theme toggle, notification preferences, packaging defaults, data export.
 */

import { toast } from '../components/toast.js';
import { getInventory } from '../api/inventory.js';
import { getNotifications } from '../api/notifications.js';

function getToggleState(key, defaultVal = true) {
  const stored = localStorage.getItem(`profiteer-${key}`);
  if (stored === null) return defaultVal;
  return stored === 'true';
}

export async function init(container) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

  // Load saved notification preferences
  const notifPrice = getToggleState('notify-price', true);
  const notifArbitrage = getToggleState('notify-arbitrage', true);
  const notifShipment = getToggleState('notify-shipment', true);
  const notifHype = getToggleState('notify-hype', false);
  const notifDeal = getToggleState('notify-deal', true);

  // Check push notification permission
  const pushPermission = ('Notification' in window) ? Notification.permission : 'unsupported';

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Settings</h2>
        <p>Configure your Profiteer.io experience</p>
      </div>

      <!-- Appearance -->
      <div class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Theme</div>
            <div class="settings-row-description">Choose between dark and light mode</div>
          </div>
          <div class="settings-row-action">
            <div class="theme-selector">
              <div class="theme-option theme-option-dark ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" role="button" tabindex="0" aria-label="Dark theme"></div>
              <div class="theme-option theme-option-light ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" role="button" tabindex="0" aria-label="Light theme"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Default Costs -->
      <div class="settings-section">
        <h3 class="settings-section-title">Default Costs</h3>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Packaging Cost</div>
            <div class="settings-row-description">Default cost per package (box, tape, bubble wrap)</div>
          </div>
          <div class="settings-row-action">
            <input type="number" class="form-input" id="setting-packaging" value="${localStorage.getItem('profiteer-packaging') || '1.50'}" step="0.25" min="0" style="width: 100px;" aria-label="Packaging cost">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Sales Tax Rate</div>
            <div class="settings-row-description">Your local sales tax rate for purchase calculations</div>
          </div>
          <div class="settings-row-action">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <input type="number" class="form-input" id="setting-tax" value="${localStorage.getItem('profiteer-tax') || '8.25'}" step="0.25" min="0" max="20" style="width: 80px;" aria-label="Tax rate">
              <span style="color: var(--text-tertiary);">%</span>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">State / Locale</div>
            <div class="settings-row-description">Used for tax calculations and local pricing</div>
          </div>
          <div class="settings-row-action">
            <select class="form-select" id="setting-state" style="width: 160px;" aria-label="State">
              <option value="CO" ${(localStorage.getItem('profiteer-state') || 'CO') === 'CO' ? 'selected' : ''}>Colorado</option>
              <option value="CA" ${localStorage.getItem('profiteer-state') === 'CA' ? 'selected' : ''}>California</option>
              <option value="TX" ${localStorage.getItem('profiteer-state') === 'TX' ? 'selected' : ''}>Texas</option>
              <option value="NY" ${localStorage.getItem('profiteer-state') === 'NY' ? 'selected' : ''}>New York</option>
              <option value="FL" ${localStorage.getItem('profiteer-state') === 'FL' ? 'selected' : ''}>Florida</option>
              <option value="WA" ${localStorage.getItem('profiteer-state') === 'WA' ? 'selected' : ''}>Washington</option>
              <option value="IL" ${localStorage.getItem('profiteer-state') === 'IL' ? 'selected' : ''}>Illinois</option>
              <option value="PA" ${localStorage.getItem('profiteer-state') === 'PA' ? 'selected' : ''}>Pennsylvania</option>
              <option value="OH" ${localStorage.getItem('profiteer-state') === 'OH' ? 'selected' : ''}>Ohio</option>
              <option value="NJ" ${localStorage.getItem('profiteer-state') === 'NJ' ? 'selected' : ''}>New Jersey</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <h3 class="settings-section-title">Notifications</h3>
        ${pushPermission !== 'unsupported' ? `
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Push Notifications</div>
            <div class="settings-row-description">Receive browser push notifications when alerts trigger</div>
          </div>
          <div class="settings-row-action">
            ${pushPermission === 'granted'
              ? '<span class="badge badge-success">Enabled</span>'
              : pushPermission === 'denied'
                ? '<span class="badge badge-danger">Blocked</span>'
                : '<button class="btn btn-primary btn-sm" id="enable-push">Enable</button>'
            }
          </div>
        </div>
        ` : ''}
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Price Alerts</div>
            <div class="settings-row-description">Get notified when tracked items hit your target price</div>
          </div>
          <div class="settings-row-action">
            <div class="toggle" data-setting="notify-price">
              <div class="toggle-track ${notifPrice ? 'active' : ''}"><div class="toggle-thumb"></div></div>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Arbitrage Opportunities</div>
            <div class="settings-row-description">New high-profit arbitrage deals found</div>
          </div>
          <div class="settings-row-action">
            <div class="toggle" data-setting="notify-arbitrage">
              <div class="toggle-track ${notifArbitrage ? 'active' : ''}"><div class="toggle-thumb"></div></div>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Shipment Updates</div>
            <div class="settings-row-description">Package status changes and delivery confirmations</div>
          </div>
          <div class="settings-row-action">
            <div class="toggle" data-setting="notify-shipment">
              <div class="toggle-track ${notifShipment ? 'active' : ''}"><div class="toggle-thumb"></div></div>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Hype Alerts</div>
            <div class="settings-row-description">Products crossing hype score thresholds</div>
          </div>
          <div class="settings-row-action">
            <div class="toggle" data-setting="notify-hype">
              <div class="toggle-track ${notifHype ? 'active' : ''}"><div class="toggle-thumb"></div></div>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Deal Alerts</div>
            <div class="settings-row-description">New deals and coupon opportunities</div>
          </div>
          <div class="settings-row-action">
            <div class="toggle" data-setting="notify-deal">
              <div class="toggle-track ${notifDeal ? 'active' : ''}"><div class="toggle-thumb"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Export -->
      <div class="settings-section">
        <h3 class="settings-section-title">Data Export</h3>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Export Inventory</div>
            <div class="settings-row-description">Download your full inventory as CSV or JSON</div>
          </div>
          <div class="settings-row-action" style="display: flex; gap: var(--space-2);">
            <button class="btn btn-secondary btn-sm" id="export-inventory-csv">CSV</button>
            <button class="btn btn-secondary btn-sm" id="export-inventory-json">JSON</button>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Export Notifications</div>
            <div class="settings-row-description">Download notification history as JSON</div>
          </div>
          <div class="settings-row-action">
            <button class="btn btn-secondary btn-sm" id="export-notifications">JSON</button>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Export Analysis History</div>
            <div class="settings-row-description">Download past profitability analyses from browser cache</div>
          </div>
          <div class="settings-row-action">
            <button class="btn btn-secondary btn-sm" id="export-analysis">JSON</button>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Version</div>
            <div class="settings-row-description">Profiteer.io build information</div>
          </div>
          <div class="settings-row-action">
            <span style="color: var(--text-secondary); font-family: var(--font-mono); font-size: var(--text-sm);">v1.0.0</span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Cache</div>
            <div class="settings-row-description">Clear cached data and service worker</div>
          </div>
          <div class="settings-row-action">
            <button class="btn btn-danger btn-sm" id="clear-cache">Clear Cache</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Theme selector
  container.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const theme = opt.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('profiteer-theme', theme);
      container.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      toast.success('Theme Updated', `Switched to ${theme} mode`);
    });
  });

  // Toggle switches
  container.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const track = toggle.querySelector('.toggle-track');
      track.classList.toggle('active');
      const setting = toggle.dataset.setting;
      const enabled = track.classList.contains('active');
      localStorage.setItem(`profiteer-${setting}`, enabled);
      toast.success('Saved', `${setting.replace('notify-', '').replace(/^\w/, c => c.toUpperCase())} notifications ${enabled ? 'enabled' : 'disabled'}`);
    });
  });

  // Save cost defaults on change
  ['setting-packaging', 'setting-tax', 'setting-state'].forEach(id => {
    const el = container.querySelector(`#${id}`);
    if (el) {
      el.addEventListener('change', () => {
        const key = id.replace('setting-', 'profiteer-');
        localStorage.setItem(key, el.value);
        toast.success('Saved', 'Setting updated');
      });
    }
  });

  // Push notification enable button
  container.querySelector('#enable-push')?.addEventListener('click', async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Push Enabled', 'You will receive browser push notifications.');
        // Reload page to update the button state
        const app = document.getElementById('app');
        if (app) init(app);
      } else {
        toast.warning('Push Denied', 'You can enable push notifications in browser settings.');
      }
    } catch {
      toast.error('Error', 'Could not request push notification permission.');
    }
  });

  // Export inventory as CSV
  container.querySelector('#export-inventory-csv')?.addEventListener('click', async () => {
    try {
      const data = await getInventory();
      const items = data.items || [];
      if (!items.length) {
        toast.info('No Data', 'No inventory items to export.');
        return;
      }
      const headers = ['id', 'name', 'purchase_price', 'current_value', 'quantity', 'condition', 'listing_status', 'purchase_source', 'storage_location', 'purchase_date'];
      const csv = [
        headers.join(','),
        ...items.map(item =>
          headers.map(h => {
            const val = item[h] ?? '';
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
          }).join(',')
        ),
      ].join('\n');
      downloadFile(csv, 'profiteer-inventory.csv', 'text/csv');
      toast.success('Exported', `${items.length} inventory items exported as CSV.`);
    } catch {
      toast.error('Export Failed', 'Could not fetch inventory data.');
    }
  });

  // Export inventory as JSON
  container.querySelector('#export-inventory-json')?.addEventListener('click', async () => {
    try {
      const data = await getInventory();
      const items = data.items || [];
      if (!items.length) {
        toast.info('No Data', 'No inventory items to export.');
        return;
      }
      downloadFile(JSON.stringify(items, null, 2), 'profiteer-inventory.json', 'application/json');
      toast.success('Exported', `${items.length} inventory items exported as JSON.`);
    } catch {
      toast.error('Export Failed', 'Could not fetch inventory data.');
    }
  });

  // Export notifications as JSON
  container.querySelector('#export-notifications')?.addEventListener('click', async () => {
    try {
      const data = await getNotifications({ limit: 200 });
      const notifications = data.notifications || [];
      if (!notifications.length) {
        toast.info('No Data', 'No notifications to export.');
        return;
      }
      downloadFile(JSON.stringify(notifications, null, 2), 'profiteer-notifications.json', 'application/json');
      toast.success('Exported', `${notifications.length} notifications exported as JSON.`);
    } catch {
      toast.error('Export Failed', 'Could not fetch notification data.');
    }
  });

  // Export analysis history from localStorage
  container.querySelector('#export-analysis')?.addEventListener('click', () => {
    try {
      const history = JSON.parse(localStorage.getItem('profiteer-analysis-history') || '[]');
      if (!history.length) {
        toast.info('No Data', 'No analysis history to export.');
        return;
      }
      downloadFile(JSON.stringify(history, null, 2), 'profiteer-analysis-history.json', 'application/json');
      toast.success('Exported', `${history.length} analysis records exported as JSON.`);
    } catch {
      toast.error('Export Failed', 'Could not read analysis history.');
    }
  });

  // Clear cache
  container.querySelector('#clear-cache')?.addEventListener('click', async () => {
    try {
      // Clear SW caches
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      // Unregister service workers
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      toast.success('Cache Cleared', 'Service worker and caches have been cleared. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error('Error', 'Could not clear cache.');
    }
  });
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
