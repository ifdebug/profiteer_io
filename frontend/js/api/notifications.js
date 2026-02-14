/** Notifications API */
import { api } from './client.js';
export function getNotifications(params = {}) { return api.get('/notifications', params); }
export function getUnreadCount() { return api.get('/notifications/unread-count'); }
export function markRead(id) { return api.put(`/notifications/${id}/read`); }
export function markAllRead() { return api.put('/notifications/read-all'); }
export function deleteNotification(id) { return api.delete(`/notifications/${id}`); }
export function deleteAllRead() { return api.delete('/notifications/read'); }
