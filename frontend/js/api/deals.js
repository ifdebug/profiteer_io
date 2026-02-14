/** Deals & Coupons API */
import { api } from './client.js';
export function getDeals(filters = {}) { return api.get('/deals', filters); }
export function getDeal(id) { return api.get(`/deals/${id}`); }
export function createDeal(data) { return api.post('/deals', data); }
export function deleteDeal(id) { return api.delete(`/deals/${id}`); }
export function voteDeal(id, direction) { return api.post(`/deals/${id}/vote?direction=${direction}`); }
