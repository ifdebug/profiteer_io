/**
 * Status badge/tag component — profit/loss/warning/hype/premium variants.
 */

export function createBadge(text, type = 'info') {
  const span = document.createElement('span');
  span.className = `badge badge-${type}`;
  span.textContent = text;
  return span;
}

export function profitabilityBadge(profitability) {
  const map = {
    strong: { text: 'Strong Profit', type: 'profit' },
    marginal: { text: 'Marginal', type: 'warning' },
    loss: { text: 'Loss', type: 'loss' },
  };
  const { text, type } = map[profitability] || map.marginal;
  return createBadge(text, type);
}

export function statusBadge(status) {
  const map = {
    unlisted: { text: 'Unlisted', type: 'info' },
    listed: { text: 'Listed', type: 'warning' },
    sold: { text: 'Sold', type: 'profit' },
    shipped: { text: 'Shipped', type: 'hype' },
    label_created: { text: 'Label Created', type: 'info' },
    in_transit: { text: 'In Transit', type: 'info' },
    out_for_delivery: { text: 'Out for Delivery', type: 'warning' },
    delivered: { text: 'Delivered', type: 'profit' },
    exception: { text: 'Exception', type: 'loss' },
  };
  const { text, type } = map[status] || { text: status, type: 'info' };
  return createBadge(text, type);
}

export function trendBadge(trend) {
  const map = {
    rising: { text: '↑ Rising', type: 'profit' },
    peaking: { text: '🔥 Peaking', type: 'warning' },
    stable: { text: '→ Stable', type: 'info' },
    falling: { text: '↓ Falling', type: 'loss' },
    dead: { text: '💀 Dead', type: 'loss' },
  };
  const { text, type } = map[trend] || { text: trend, type: 'info' };
  return createBadge(text, type);
}

export function confidenceBadge(confidence) {
  const map = {
    high: { text: 'High Confidence', type: 'profit' },
    medium: { text: 'Medium', type: 'warning' },
    low: { text: 'Low', type: 'loss' },
  };
  const { text, type } = map[confidence] || map.medium;
  return createBadge(text, type);
}
