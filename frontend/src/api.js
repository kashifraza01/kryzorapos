import axios from 'axios';

/**
 * BULLETPROOF cloud vs offline detection.
 * 
 * Detection is purely HOSTNAME-BASED (runtime check):
 *   CLOUD  = Browser hostname is NOT localhost/127.0.0.1 (Vercel, any hosted domain)
 *   OFFLINE = Electron/dev on localhost or 127.0.0.1
 * 
 * NOTE: VITE_API_URL is baked at BUILD time and exists in BOTH Electron + Vercel
 * bundles, so it CANNOT be used to determine mode. Only hostname is reliable.
 */
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
const envApiUrl = import.meta.env.VITE_API_URL || '';

export const isCloudMode = currentHost !== 'localhost' && currentHost !== '127.0.0.1' && currentHost !== '';

// API URL: In offline/Electron mode, always use local PHP server.
// In cloud mode, use env var or derive from current host.
const API_URL = (() => {
    // OFFLINE MODE (Electron) — always use local PHP backend
    if (!isCloudMode) {
        return 'http://127.0.0.1:8111/api';
    }
    // CLOUD MODE — use env var if set, otherwise derive from current host
    if (envApiUrl) return envApiUrl;
    const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${proto}//${window.location.host}/api`;
})();

// Debug: log detection result on startup
console.log('[KryzoraPOS] isCloudMode:', isCloudMode, '| API_URL:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Accept': 'application/json'
    }
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data || {};

            if (status === 500) {
                console.error('Server error:', data.message || 'Internal server error');
            }

            if (status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('isAuthenticated');
                window.location.href = '/';
            }
        }

        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.error('Request timeout - backend may be down');
        }

        if (!error.response && error.message === 'Network Error') {
            console.error('Network error - check your internet connection');
        }

        return Promise.reject(error);
    }
);

export default api;
