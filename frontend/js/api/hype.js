/** Hype Analyzer API */
import { api } from './client.js';
export function getHypeScore(itemId) { return api.get(`/hype/${itemId}`); }
export function getLeaderboards() { return api.get('/hype/leaderboards'); }
