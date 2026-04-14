import axios from 'axios';

/**
 * Detect cloud vs offline mode based on API URL.
 * If VITE_API_URL is NOT localhost/127.0.0.1 → CLOUD MODE.
 * If VITE_API_URL is localhost/127.0.0.1 or empty → OFFLINE MODE.
 */
const apiUrl = import.meta.env.VITE_API_URL || '/api';
export const isCloudMode = !/localhost|127\.0\.0\.1/i.test(apiUrl);

const api = axios.create({
    baseURL: apiUrl,
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
                // CLOUD MODE: subscription expired → redirect to login (NOT license page)
                if (data.requires_subscription) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('license');
                    window.location.href = '/';
                }
                // Ignore requires_activation in cloud mode — it's not relevant
            } else {
                // OFFLINE MODE: license expired → clear state and reload
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
