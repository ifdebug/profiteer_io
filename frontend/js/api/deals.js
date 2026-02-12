/** Deals & Coupons API */
import { api } from './client.js';
export function getDeals(filters = {}) { return api.get('/deals', filters); }
