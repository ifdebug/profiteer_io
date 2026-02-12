/**
 * Application constants — marketplace data, carriers, categories, status labels.
 */

export const API_BASE_URL = 'http://localhost:8000/api/v1';

export const MARKETPLACES = {
  ebay: { name: 'eBay', color: 'var(--color-p7-blue)' },
  tcgplayer: { name: 'TCGPlayer', color: 'var(--color-raster-cyan)' },
  amazon: { name: 'Amazon', color: 'var(--color-terminal)' },
  stockx: { name: 'StockX', color: 'var(--color-p3-amber)' },
  mercari: { name: 'Mercari', color: 'var(--color-degauss)' },
  whatnot: { name: 'Whatnot', color: 'var(--color-gold-pin)' },
  facebook: { name: 'Facebook Marketplace', color: 'var(--color-hot-cathode)' },
  craigslist: { name: 'Craigslist', color: 'var(--color-cool-phosphor)' },
};

export const CHART_COLORS = [
  '#4DA8FF', // p7-blue
  '#00E5CC', // raster-cyan
  '#2AD40E', // terminal
  '#FFB627', // p3-amber
  '#A855F7', // degauss
  '#F5C842', // gold-pin
  '#E0392A', // hot-cathode
];

export const CARRIERS = {
  usps: { name: 'USPS', color: '#004B87' },
  ups: { name: 'UPS', color: '#351C15' },
  fedex: { name: 'FedEx', color: '#4D148C' },
  dhl: { name: 'DHL', color: '#FFCC00' },
};

export const SHIPMENT_STATUSES = {
  label_created: { label: 'Label Created', icon: '🏷️', color: 'var(--text-tertiary)' },
  accepted: { label: 'Accepted', icon: '📦', color: 'var(--action)' },
  in_transit: { label: 'In Transit', icon: '🚚', color: 'var(--action)' },
  out_for_delivery: { label: 'Out for Delivery', icon: '📬', color: 'var(--warning)' },
  delivered: { label: 'Delivered', icon: '✅', color: 'var(--profit)' },
  exception: { label: 'Exception', icon: '⚠️', color: 'var(--loss)' },
};

export const LISTING_STATUSES = {
  unlisted: { label: 'Unlisted', class: 'badge-info' },
  listed: { label: 'Listed', class: 'badge-warning' },
  sold: { label: 'Sold', class: 'badge-profit' },
  shipped: { label: 'Shipped', class: 'badge-hype' },
};

export const CATEGORIES = [
  'Electronics',
  'Trading Cards',
  'Sneakers',
  'Toys',
  'Collectibles',
  'Video Games',
  'Clothing',
  'Home & Garden',
];

export const HYPE_TRENDS = {
  rising: { label: 'Rising', icon: '📈', color: 'var(--profit)' },
  peaking: { label: 'Peaking', icon: '🔥', color: 'var(--warning)' },
  stable: { label: 'Stable', icon: '➡️', color: 'var(--action)' },
  falling: { label: 'Falling', icon: '📉', color: 'var(--loss)' },
  dead: { label: 'Dead', icon: '💀', color: 'var(--text-disabled)' },
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '#/' },
  { id: 'analyzer', label: 'Analyzer', icon: '💰', route: '#/analyzer' },
  { id: 'trends', label: 'Trends', icon: '📈', route: '#/trends' },
  { id: 'shipments', label: 'Shipments', icon: '📦', route: '#/shipments' },
  { id: 'arbitrage', label: 'Arbitrage', icon: '🔄', route: '#/arbitrage' },
  { id: 'inventory', label: 'Inventory', icon: '📋', route: '#/inventory' },
  { id: 'deals', label: 'Deals', icon: '🏷️', route: '#/deals' },
  { id: 'hype', label: 'Hype', icon: '🔥', route: '#/hype' },
  { id: 'settings', label: 'Settings', icon: '⚙️', route: '#/settings' },
];
