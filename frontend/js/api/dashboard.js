/** Dashboard API */
import { api } from './client.js';
export function getDashboardData() { return api.get('/dashboard'); }
