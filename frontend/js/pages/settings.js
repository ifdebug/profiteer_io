/**
 * Settings page — theme toggle, notification preferences, packaging defaults, data export.
 */

import { toast } from '../components/toast.js';

export async function init(container) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

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
            </select>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-section">
        <h3 class="settings-section-title">Notifications</h3>
        <div class="settings-row">
          <div class="settings-row-info">
            <div class="settings-row-label">Price Alerts</div>
            <div class="settings-row-description">Get notified when tracked items hit your target price</div>
          </div>
          <div class="settings-row-action">
            <div class="toggle" data-setting="notify-price">
              <div class="toggle-track active"><div class="toggle-thumb"></div></div>
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
              <div class="toggle-track active"><div class="toggle-thumb"></div></div>
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
              <div class="toggle-track active"><div class="toggle-thumb"></div></div>
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
              <div class="toggle-track"><div class="toggle-thumb"></div></div>
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
            <button class="btn btn-secondary btn-sm" id="export-csv">CSV</button>
            <button class="btn btn-secondary btn-sm" id="export-json">JSON</button>
          </div>
        </div>
      </div>

      <div style="text-align: center; padding: var(--space-6); color: var(--text-disabled); font-size: var(--text-xs);">
        Profiteer.io v0.1.0 — Phase 1 Foundation
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

  // Export buttons
  container.querySelector('#export-csv').addEventListener('click', () => {
    toast.info('Export', 'CSV export will be fully functional in Phase 2.');
  });
  container.querySelector('#export-json').addEventListener('click', () => {
    toast.info('Export', 'JSON export will be fully functional in Phase 2.');
  });
}
