/**
 * Price Trends page — interactive chart with marketplace overlays and period selector.
 */

import { getTrends } from '../api/trends.js';
import { createLineChart } from '../components/chart.js';
import { skeletonChart, skeletonCards } from '../components/skeleton.js';
import { formatCurrency, formatPercent } from '../utils/format.js';
import { CHART_COLORS } from '../utils/constants.js';

let chartInstance = null;

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Price Trends</h2>
        <p>Track how item prices change across marketplaces over time</p>
      </div>

      <div class="trends-controls">
        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <input type="text" class="form-input" id="trends-search" placeholder="Search item..." value="Pokemon 151 Bundle" style="max-width: 280px;" aria-label="Item search">
          <button class="btn btn-primary btn-sm" id="trends-search-btn">Search</button>
        </div>
        <div class="period-selector" id="period-selector">
          <button class="period-btn" data-period="7d">7D</button>
          <button class="period-btn active" data-period="30d">30D</button>
          <button class="period-btn" data-period="90d">90D</button>
          <button class="period-btn" data-period="1y">1Y</button>
          <button class="period-btn" data-period="all">All</button>
        </div>
      </div>

      <div id="trends-content">
        ${skeletonChart()}
        <div style="margin-top: var(--space-4);">${skeletonCards(4)}</div>
      </div>
    </div>
  `;

  let currentPeriod = '30d';
  const content = container.querySelector('#trends-content');

  // Period selector
  container.querySelector('#period-selector').addEventListener('click', async (e) => {
    if (!e.target.classList.contains('period-btn')) return;
    container.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentPeriod = e.target.dataset.period;
    await loadTrends(content, 1, currentPeriod);
  });

  // Search
  container.querySelector('#trends-search-btn').addEventListener('click', () => {
    loadTrends(content, 1, currentPeriod);
  });

  await loadTrends(content, 1, currentPeriod);
}

async function loadTrends(content, itemId, period) {
  content.innerHTML = `${skeletonChart()}<div style="margin-top: var(--space-4);">${skeletonCards(4)}</div>`;

  let data;
  try {
    data = await getTrends(itemId, period);
  } catch {
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><h3 class="empty-state-title">Could not load trends</h3></div>';
    return;
  }

  const changeClass = data.price_change_pct >= 0 ? 'text-profit' : 'text-loss';
  const changeSign = data.price_change_pct >= 0 ? '+' : '';

  content.innerHTML = `
    <div class="chart-container animate-fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <div>
          <h3 style="font-size: var(--text-lg);">${data.item_name}</h3>
          <div style="display: flex; align-items: baseline; gap: var(--space-2); margin-top: var(--space-1);">
            <span class="financial" style="font-size: var(--text-2xl); font-weight: 700;">${formatCurrency(data.current_price)}</span>
            <span class="${changeClass}" style="font-weight: 600;">${changeSign}${formatPercent(data.price_change_pct)}</span>
            <span class="badge badge-${data.trend === 'rising' ? 'profit' : data.trend === 'falling' ? 'loss' : 'info'}">${data.trend}</span>
          </div>
        </div>
      </div>
      <div class="chart-canvas-wrapper">
        <canvas id="trends-chart"></canvas>
      </div>
    </div>

    <div class="trend-stats animate-fade-in-up" style="margin-top: var(--space-4);">
      ${Object.entries(data.marketplaces).map(([name, mp]) => `
        <div class="card" style="padding: var(--space-4);">
          <div class="card-title" style="margin-bottom: var(--space-2);">${name}</div>
          <div class="financial" style="font-size: var(--text-xl); font-weight: 700;">${formatCurrency(mp.current)}</div>
          <div style="display: flex; justify-content: space-between; margin-top: var(--space-2); font-size: var(--text-xs); color: var(--text-tertiary);">
            <span>H: ${formatCurrency(mp.high)}</span>
            <span>L: ${formatCurrency(mp.low)}</span>
            <span>Avg: ${formatCurrency(mp.avg)}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="card animate-fade-in-up" style="margin-top: var(--space-4); padding: var(--space-4);">
      <div class="card-title" style="margin-bottom: var(--space-2);">Volume</div>
      <div style="display: flex; gap: var(--space-6);">
        <div><span class="financial" style="font-weight: 700;">${data.volume.total_sales_period.toLocaleString()}</span> <span style="color: var(--text-tertiary); font-size: var(--text-sm);">total sales</span></div>
        <div><span class="financial" style="font-weight: 700;">${data.volume.avg_daily_sales}</span> <span style="color: var(--text-tertiary); font-size: var(--text-sm);">avg/day</span></div>
      </div>
    </div>
  `;

  // Build chart
  const canvas = content.querySelector('#trends-chart');
  if (chartInstance) chartInstance.destroy();

  const marketplaceNames = Object.keys(data.marketplaces);
  const firstMp = data.marketplaces[marketplaceNames[0]];
  const labels = firstMp.data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const datasets = marketplaceNames.map((name, i) => ({
    label: name,
    data: data.marketplaces[name].data.map(d => d.price),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  chartInstance = createLineChart(canvas, {
    labels,
    datasets,
    options: {
      scales: {
        y: {
          ticks: {
            callback: (v) => '$' + v,
          },
        },
      },
    },
  });
}
