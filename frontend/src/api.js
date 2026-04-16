import axios from 'axios';

/**
 * CLOUD MODE DETECTION
 * 
 * This runs at module load time. For Vercel builds:
 * - During build: window is undefined → checks import.meta.env
 * - During runtime: window.location.hostname is the deployed domain
 * 
 * We check VITE_API_URL first - if set, we're definitely in cloud mode.
 * Otherwise, check if we're NOT on localhost/127.0.0.1
 */
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
const envApiUrl = import.meta.env.VITE_API_URL;

// If VITE_API_URL is set (even to empty string), use it
// Otherwise, determine from hostname
export const isCloudMode = !!envApiUrl || (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && currentHost !== '');

// API URL: use env var if available for cloud mode, otherwise localhost
const API_URL = envApiUrl || (
    isCloudMode && typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}/api`
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
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data || {};

            // Handle 401 - redirect to login
            if (status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('license');
                window.location.href = '/';
            }

            // Handle 500 errors
            if (status === 500) {
                console.error('Server error:', data.message || 'Internal server error');
            }
        }

        // Handle network errors
        if (!error.response) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                console.error('Request timeout - backend may be down');
            }
            if (error.message === 'Network Error') {
                console.error('Network error - check your internet connection');
            }
        }

        return Promise.reject(error);
    }
);

export default api;
