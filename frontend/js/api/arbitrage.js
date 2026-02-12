/** Arbitrage Finder API */
import { api } from './client.js';
export function getOpportunities(filters = {}) { return api.get('/arbitrage/opportunities', filters); }
