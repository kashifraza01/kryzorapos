import axios from 'axios';

/**
 * BULLETPROOF cloud vs offline detection.
 * 
 * PRIMARY: Check the browser URL — if we're NOT on localhost, we're in CLOUD.
 * This works even if VITE_API_URL is not set during Vercel build.
 * 
 * OFFLINE = Electron app running on localhost/127.0.0.1
 * CLOUD = Vercel/any hosted domain
 */
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
export const isCloudMode = currentHost !== 'localhost' && currentHost !== '127.0.0.1' && currentHost !== '';

// API URL: use env var if available, otherwise derive from current host
const API_URL = import.meta.env.VITE_API_URL || (
    isCloudMode
        ? 'https://terrific-simplicity-aa.up.railway.app/api'
        : '/api'
);

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
        if (error.response && error.response.status === 403) {
            const data = error.response.data || {};

            if (isCloudMode) {
                if (data.requires_subscription) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('license');
                    window.location.href = '/';
                }
            } else {
                if (data.requires_activation) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('license');
                    window.location.href = '/';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
