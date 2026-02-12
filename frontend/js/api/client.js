/**
 * Base API client — fetch wrapper with error handling and toast notifications.
 */

import { API_BASE_URL } from '../utils/constants.js';
import { toast } from '../components/toast.js';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        toast.error('Connection Error', 'Unable to connect to the server. Check that the backend is running.');
      } else {
        toast.error('API Error', error.message);
      }
      throw error;
    }
  }

  get(endpoint, params = {}) {
    const query = Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url);
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
