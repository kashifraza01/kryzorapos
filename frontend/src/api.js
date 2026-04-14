import axios from 'axios';

/**
 * CLOUD vs OFFLINE detection — HARD RULE:
 * If VITE_API_URL exists AND is NOT localhost → CLOUD MODE.
 */
const API_URL = import.meta.env.VITE_API_URL;
export const isCloudMode = !!API_URL && !API_URL.includes('127.0.0.1') && !API_URL.includes('localhost');

const api = axios.create({
    baseURL: API_URL || '/api',
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
                // CLOUD: only handle subscription expiry → go to login
                if (data.requires_subscription) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('license');
                    window.location.href = '/';
                }
                // IGNORE requires_activation in cloud — it does not apply
            } else {
                // OFFLINE: handle license activation
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
