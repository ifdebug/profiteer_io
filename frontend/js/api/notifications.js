/** Notifications API */
import { api } from './client.js';
export function getNotifications() { return api.get('/notifications'); }
export function markRead(id) { return api.put(`/notifications/${id}/read`); }
export function markAllRead() { return api.put('/notifications/read-all'); }
