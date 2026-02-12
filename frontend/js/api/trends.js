/** Price Trends API */
import { api } from './client.js';
export function getTrends(itemId, period = '30d') { return api.get(`/trends/${itemId}`, { period }); }
