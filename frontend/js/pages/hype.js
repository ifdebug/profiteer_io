/**
 * Hype Analyzer page — hype score gauge, signals, trend, and leaderboards.
 */

import { getHypeScore, getLeaderboards } from '../api/hype.js';
import { createGauge, createLineChart } from '../components/chart.js';
import { skeletonCards, skeletonChart } from '../components/skeleton.js';
import { abbreviateNumber } from '../utils/format.js';

let gaugeInstance = null;
let historyChartInstance = null;

export async function init(container) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Hype Analyzer</h2>
        <p>Measure buzz and demand to predict profitability</p>
      </div>

      <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-6);">
        <input type="text" class="form-input" id="hype-search" placeholder="Search product..." value="Pokemon Prismatic Evolutions" style="max-width: 340px;" aria-label="Product search">
        <button class="btn btn-primary" id="hype-search-btn">Analyze</button>
      </div>

      <div id="hype-content">${skeletonChart()}${skeletonCards(3)}</div>
      <div id="hype-leaderboards" style="margin-top: var(--space-6);"></div>
    </div>
  `;

  container.querySelector('#hype-search-btn').addEventListener('click', () => {
    loadHype(container, '1');
  });

  await Promise.all([
    loadHype(container, '1'),
    loadLeaderboards(container),
  ]);
}

async function loadHype(container, itemId) {
  const content = container.querySelector('#hype-content');
  content.innerHTML = `${skeletonChart()}${skeletonCards(3)}`;

  let data;
  try {
    data = await getHypeScore(itemId);
  } catch {
    content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔥</div><h3 class="empty-state-title">Could not load hype data</h3></div>';
    return;
  }

  const trendColors = { rising: 'var(--profit)', peaking: 'var(--warning)', stable: 'var(--action)', falling: 'var(--loss)', dead: 'var(--text-disabled)' };
  const trendColor = trendColors[data.trend] || trendColors.stable;

  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
      <!-- Gauge -->
      <div class="card animate-fade-in">
        <div class="hype-gauge-container">
          <div class="hype-gauge">
            <canvas id="hype-gauge-canvas"></canvas>
          </div>
          <div class="hype-score-value" style="color: ${trendColor};">${data.hype_score}</div>
          <div style="font-size: var(--text-xs); color: var(--text-tertiary);">out of 100</div>
          <div class="hype-trend-label" style="color: ${trendColor};">${data.trend}</div>
          <div style="font-size: var(--text-lg); font-weight: 600; margin-top: var(--space-3);">${data.item_name}</div>
        </div>
      </div>

      <!-- History Chart -->
      <div class="card animate-fade-in">
        <div class="card-header"><span class="card-title">Hype Score History</span></div>
        <div style="height: 200px;">
          <canvas id="hype-history-canvas"></canvas>
        </div>
      </div>
    </div>

    <!-- Signals -->
    <div class="hype-signals" style="margin-top: var(--space-4);">
      <div class="signal-card animate-fade-in-up" style="animation-delay: 50ms;">
        <div class="signal-value">${data.signals.google_trends}</div>
        <div class="signal-label">Google Trends</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 100ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.reddit_mentions)}</div>
        <div class="signal-label">Reddit Mentions</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 150ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.twitter_mentions)}</div>
        <div class="signal-label">X/Twitter</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 200ms;">
        <div class="signal-value">${data.signals.youtube_videos}</div>
        <div class="signal-label">YouTube Videos</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 250ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.youtube_views)}</div>
        <div class="signal-label">YouTube Views</div>
      </div>
      <div class="signal-card animate-fade-in-up" style="animation-delay: 300ms;">
        <div class="signal-value">${abbreviateNumber(data.signals.tiktok_views)}</div>
        <div class="signal-label">TikTok Views</div>
      </div>
    </div>
  `;

  // Render gauge
  if (gaugeInstance) gaugeInstance.destroy();
  const gaugeCanvas = content.querySelector('#hype-gauge-canvas');
  gaugeInstance = createGauge(gaugeCanvas, { value: data.hype_score, max: 100 });

  // Render history chart
  if (historyChartInstance) historyChartInstance.destroy();
  if (data.history && data.history.length) {
    const historyCanvas = content.querySelector('#hype-history-canvas');
    historyChartInstance = createLineChart(historyCanvas, {
      labels: data.history.map(h => h.date.slice(5)),
      datasets: [{
        label: 'Hype Score',
        data: data.history.map(h => h.score),
        color: '#00E5CC',
        fill: true,
      }],
      options: {
        scales: {
          y: { min: 0, max: 100 },
        },
      },
    });
  }
}

async function loadLeaderboards(container) {
  const section = container.querySelector('#hype-leaderboards');

  let data;
  try {
    data = await getLeaderboards();
  } catch {
    return;
  }

  section.innerHTML = `
    <h3 style="margin-bottom: var(--space-4);">Category Leaderboards</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4);">
      ${Object.entries(data.leaderboards).map(([category, items]) => `
        <div class="card">
          <div class="card-header">
            <span class="card-title">${category.replace(/_/g, ' ')}</span>
          </div>
          <div class="leaderboard-list">
            ${items.map((item, i) => {
              const scoreColor = item.score >= 70 ? 'var(--profit)' : item.score >= 40 ? 'var(--warning)' : 'var(--text-tertiary)';
              const trendBadge = item.trend === 'rising' ? 'badge-profit' : item.trend === 'falling' ? 'badge-loss' : 'badge-info';
              return `
                <div class="leaderboard-item">
                  <div class="leaderboard-rank">#${i + 1}</div>
                  <div class="leaderboard-name">${item.name}</div>
                  <span class="badge ${trendBadge}" style="font-size: 10px;">${item.trend}</span>
                  <div class="leaderboard-score" style="color: ${scoreColor};">${item.score}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
