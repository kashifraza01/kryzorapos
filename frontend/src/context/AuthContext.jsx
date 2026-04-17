import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { isCloudMode } from '../api';

const AuthContext = createContext();

// All features always unlocked — no licensing
const ALL_FEATURES = [
    'pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
    'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
    'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
    'settings', 'dashboard-full'
];

const FULL_LICENSE = {
    is_active: true,
    status: 'active',
    plan: 'full',
    features: ALL_FEATURES,
    message: 'All features unlocked',
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            // Ping server to ensure it is up (only in offline/Electron mode)
            if (!isCloudMode) {
                let retries = 0;
                while (retries < 15) {
                    try {
                        await api.get('/settings/public');
                        break;
                    } catch (e) {
                        await new Promise(r => setTimeout(r, 1000));
                        retries++;
                    }
                }
            }

            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                setUser(JSON.parse(savedUser));
            }

            // Always set full license — no licensing system
            localStorage.setItem('license', JSON.stringify(FULL_LICENSE));

            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (credentials) => {
        const res = await api.post('/login', credentials);
        const { user, token } = res.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('license', JSON.stringify(FULL_LICENSE));

        setUser(user);
        return user;
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (err) {
            console.error('Logout failed', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('license');
            setUser(null);
        }
    };

    const hasPermission = (permissionSlug) => {
        if (!user || !user.role || !user.role.permissions) return false;
        return user.role.permissions.some(p => p.slug === permissionSlug);
    };

    // All features always available — no licensing
    const hasFeature = () => true;

    const updateLicense = () => {};
    const refreshLicense = async () => FULL_LICENSE;

    return (
        <AuthContext.Provider value={{
            user, login, logout, hasPermission, loading,
            license: FULL_LICENSE, hasFeature, updateLicense, refreshLicense,
            isCloudMode,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
