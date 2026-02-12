/**
 * Dashboard page — home screen with profit summary, inventory, shipments, arbitrage, and activity.
 */

import { getDashboardData } from '../api/dashboard.js';
import { skeletonDashboard } from '../components/skeleton.js';
import { formatCurrency, formatProfitSign, formatProfitColor, timeAgo, abbreviateNumber } from '../utils/format.js';

export async function init(container) {
  container.innerHTML = skeletonDashboard();

  let data;
  try {
    data = await getDashboardData();
  } catch {
    container.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h3 class="empty-state-title">Unable to load dashboard</h3>
          <p class="empty-state-description">Make sure the backend server is running on port 8000.</p>
        </div>
      </div>
    `;
    return;
  }

  const ps = data.profit_summary;
  const inv = data.inventory_snapshot;
  const ship = data.active_shipments;

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Dashboard</h2>
        <p>Your reselling business at a glance</p>
      </div>

      <!-- Profit Summary -->
      <div class="dashboard-grid" style="margin-bottom: var(--space-6);">
        <div class="card stat-card">
          <div class="card-title">Today's Profit</div>
          <div class="stat-value financial text-profit">${formatCurrency(ps.today)}</div>
          <div class="stat-change text-profit">↑ ${ps.trend}</div>
        </div>
        <div class="card stat-card">
          <div class="card-title">This Week</div>
          <div class="stat-value financial text-profit">${formatCurrency(ps.this_week)}</div>
        </div>
        <div class="card stat-card">
          <div class="card-title">This Month</div>
          <div class="stat-value financial text-profit">${formatCurrency(ps.this_month)}</div>
        </div>
        <div class="card stat-card">
          <div class="card-title">Inventory Value</div>
          <div class="stat-value financial">${formatCurrency(inv.total_value)}</div>
          <div class="stat-change text-profit">+${formatCurrency(inv.unrealized_pl)} unrealized</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);">
        <!-- Active Shipments -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Active Shipments</span>
            <a href="#/shipments" class="btn btn-ghost btn-sm">View All →</a>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
            <div style="text-align: center; padding: var(--space-3);">
              <div class="financial" style="font-size: var(--text-2xl); font-weight: 700;">${ship.total}</div>
              <div style="font-size: var(--text-xs); color: var(--text-tertiary);">Total</div>
            </div>
            <div style="text-align: center; padding: var(--space-3);">
              <div class="financial" style="font-size: var(--text-2xl); font-weight: 700; color: var(--action);">${ship.in_transit}</div>
              <div style="font-size: var(--text-xs); color: var(--text-tertiary);">In Transit</div>
            </div>
            <div style="text-align: center; padding: var(--space-3);">
              <div class="financial" style="font-size: var(--text-2xl); font-weight: 700; color: var(--profit);">${ship.delivered_today}</div>
              <div style="font-size: var(--text-xs); color: var(--text-tertiary);">Delivered Today</div>
            </div>
            <div style="text-align: center; padding: var(--space-3);">
              <div class="financial" style="font-size: var(--text-2xl); font-weight: 700; color: var(--loss);">${ship.exceptions}</div>
              <div style="font-size: var(--text-xs); color: var(--text-tertiary);">Exceptions</div>
            </div>
          </div>
        </div>

        <!-- Hot Arbitrage -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Hot Arbitrage Deals</span>
            <a href="#/arbitrage" class="btn btn-ghost btn-sm">View All →</a>
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            ${data.hot_arbitrage.map(deal => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-scan-line);">
                <div>
                  <div style="font-size: var(--text-sm); font-weight: 500;">${deal.item}</div>
                  <div style="font-size: var(--text-xs); color: var(--text-tertiary);">${deal.buy_platform} → ${deal.sell_platform}</div>
                </div>
                <div class="financial text-profit" style="font-weight: 700;">+${formatCurrency(deal.est_profit)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);">
        <!-- Trending Hype -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Trending Products</span>
            <a href="#/hype" class="btn btn-ghost btn-sm">View All →</a>
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            ${data.trending_hype.map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) 0;">
                <div style="font-size: var(--text-sm); font-weight: 500;">${item.name}</div>
                <div style="display: flex; align-items: center; gap: var(--space-2);">
                  <span class="badge badge-hype">${item.hype_score}</span>
                  <span style="font-size: var(--text-xs); color: var(--text-tertiary);">${item.trend}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Top Inventory -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Top Inventory Items</span>
            <a href="#/inventory" class="btn btn-ghost btn-sm">View All →</a>
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            ${inv.top_items.map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-scan-line);">
                <div>
                  <div style="font-size: var(--text-sm); font-weight: 500;">${item.name}</div>
                  <div style="font-size: var(--text-xs); color: var(--text-tertiary);">Value: ${formatCurrency(item.value)}</div>
                </div>
                <div class="financial text-profit" style="font-weight: 600;">+${formatCurrency(item.pl)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent Activity</span>
        </div>
        <div>
          ${data.recent_activity.map(activity => {
            const iconMap = { sold: '💵', listed: '📝', purchased: '🛒', price_change: '📊', delivered: '📬' };
            const bgMap = { sold: 'var(--profit-bg)', listed: 'var(--action-bg)', purchased: 'var(--warning-bg)', price_change: 'var(--hype-bg)', delivered: 'var(--profit-bg)' };
            return `
              <div class="activity-item">
                <div class="activity-icon" style="background: ${bgMap[activity.action] || 'var(--action-bg)'};">
                  ${iconMap[activity.action] || '📌'}
                </div>
                <div class="activity-text">
                  <div class="activity-title">${activity.item}</div>
                  <div class="activity-detail">${activity.detail}</div>
                </div>
                <div class="activity-time">${timeAgo(activity.timestamp)}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
