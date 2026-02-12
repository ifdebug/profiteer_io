/** Inventory Manager API */
import { api } from './client.js';
export function getInventory() { return api.get('/inventory'); }
export function getInventoryItem(id) { return api.get(`/inventory/${id}`); }
export function addItem(data) { return api.post('/inventory', data); }
export function updateItem(id, data) { return api.put(`/inventory/${id}`, data); }
export function deleteItem(id) { return api.delete(`/inventory/${id}`); }
