/** Profitability Analyzer API */
import { api } from './client.js';
export function analyzeItem(data) { return api.post('/analyzer/analyze', data); }
