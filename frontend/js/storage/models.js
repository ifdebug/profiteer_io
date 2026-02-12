/**
 * Client-side data models for offline-capable items.
 */

import { cache } from './cache.js';

const STORE_PREFIX = 'profiteer_store_';

export const store = {
  getSettings() {
    return {
      theme: localStorage.getItem('profiteer-theme') || 'dark',
      packagingCost: parseFloat(localStorage.getItem('profiteer-packaging')) || 1.50,
      taxRate: parseFloat(localStorage.getItem('profiteer-tax')) || 8.25,
      state: localStorage.getItem('profiteer-state') || 'CO',
    };
  },

  saveSettings(settings) {
    if (settings.theme) localStorage.setItem('profiteer-theme', settings.theme);
    if (settings.packagingCost != null) localStorage.setItem('profiteer-packaging', settings.packagingCost);
    if (settings.taxRate != null) localStorage.setItem('profiteer-tax', settings.taxRate);
    if (settings.state) localStorage.setItem('profiteer-state', settings.state);
  },

  getWatchlist() {
    try {
      return JSON.parse(localStorage.getItem(STORE_PREFIX + 'watchlist')) || [];
    } catch {
      return [];
    }
  },

  addToWatchlist(item) {
    const list = this.getWatchlist();
    if (!list.find(i => i.id === item.id)) {
      list.push(item);
      localStorage.setItem(STORE_PREFIX + 'watchlist', JSON.stringify(list));
    }
  },

  removeFromWatchlist(itemId) {
    const list = this.getWatchlist().filter(i => i.id !== itemId);
    localStorage.setItem(STORE_PREFIX + 'watchlist', JSON.stringify(list));
  },

  getAnalysisHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORE_PREFIX + 'analysis_history')) || [];
    } catch {
      return [];
    }
  },

  saveAnalysis(analysis) {
    const history = this.getAnalysisHistory();
    history.unshift({ ...analysis, savedAt: new Date().toISOString() });
    // Keep last 50
    if (history.length > 50) history.length = 50;
    localStorage.setItem(STORE_PREFIX + 'analysis_history', JSON.stringify(history));
  },
};
