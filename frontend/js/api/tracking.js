/** Shipment Tracking API */
import { api } from './client.js';
export function getShipments() { return api.get('/shipments'); }
export function getShipment(id) { return api.get(`/shipments/${id}`); }
export function addShipment(data) { return api.post('/shipments', data); }
export function deleteShipment(id) { return api.delete(`/shipments/${id}`); }
export function refreshShipment(id) { return api.post(`/shipments/${id}/refresh`); }
