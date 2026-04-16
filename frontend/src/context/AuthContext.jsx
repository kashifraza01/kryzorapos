import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { isCloudMode } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [license, setLicense] = useState(null);
    const [serverStatus, setServerStatus] = useState('connecting'); // 'connecting' | 'online' | 'offline'

    useEffect(() => {
        const initAuth = async () => {
            // Ping server to ensure it is up - reduced retries for faster feedback
            let retries = 0;
            const maxRetries = 5;
            
            while (retries < maxRetries) {
                try {
                    await api.get('/settings/public');
                    setServerStatus('online');
                    break;
                } catch (e) {
                    retries++;
                    if (retries >= maxRetries) {
                        setServerStatus('offline');
                        console.warn('Server unreachable after retries');
                    } else {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                setUser(JSON.parse(savedUser));
            }

            // ============================================================
            // CLOUD MODE: Force license as active. No license check needed.
            // OFFLINE MODE: Load from localStorage or fetch from server.
            // ============================================================
            if (isCloudMode) {
                // HARD SET: Cloud always has license active.
                // Actual feature gating happens via subscription after login.
                setLicense({
                    is_active: true,
                    status: 'cloud',
                    plan: 'full',
                    features: ['pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
                        'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
                        'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
                        'settings', 'dashboard-full'],
                    message: 'Cloud mode active',
                });
            } else {
                // OFFLINE: Check saved license or fetch from server
                const savedLicense = localStorage.getItem('license');
                if (savedLicense) {
                    setLicense(JSON.parse(savedLicense));
                } else {
                    try {
                        const res = await api.get('/auth/license/check');
                        const licenseData = {
                            is_active: res.data.valid || res.data.is_active,
                            status: res.data.status,
                            plan: res.data.plan,
                            features: res.data.features || [],
                            message: res.data.message,
                        };
                        localStorage.setItem('license', JSON.stringify(licenseData));
                        setLicense(licenseData);
                    } catch (err) {
                        console.error('License check failed:', err);
                    }
                }
            }

            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (credentials) => {
        const res = await api.post('/login', credentials);
        const { user, token, license: licData } = res.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');

        // In cloud mode, if server returns no features (no subscription), give full access
        if (licData && isCloudMode) {
            const finalLicense = {
                is_active: licData.is_active ?? true,
                status: licData.status ?? 'cloud',
                plan: licData.plan ?? 'full',
                features: (licData.features && licData.features.length > 0) 
                    ? licData.features 
                    : ['pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
                        'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
                        'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
                        'settings', 'dashboard-full'],
                message: licData.message ?? 'Cloud mode active',
            };
            localStorage.setItem('license', JSON.stringify(finalLicense));
            setLicense(finalLicense);
        } else if (licData) {
            localStorage.setItem('license', JSON.stringify(licData));
            setLicense(licData);
        } else if (isCloudMode) {
            // Fallback: full features for cloud if no license data
            const fullLicense = {
                is_active: true,
                status: 'cloud',
                plan: 'full',
                features: ['pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
                    'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
                    'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
                    'settings', 'dashboard-full'],
                message: 'Cloud mode active',
            };
            localStorage.setItem('license', JSON.stringify(fullLicense));
            setLicense(fullLicense);
        }

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
            setLicense(null);
        }
    };

    const hasPermission = (permissionSlug) => {
        if (!user || !user.role || !user.role.permissions) return false;
        return user.role.permissions.some(p => p.slug === permissionSlug);
    };

    const hasFeature = (featureSlug) => {
        if (!license || !license.is_active) return false;
        return (license.features || []).includes(featureSlug);
    };

    const updateLicense = (licenseData) => {
        localStorage.setItem('license', JSON.stringify(licenseData));
        setLicense(licenseData);
    };

    const refreshLicense = async () => {
        if (isCloudMode) {
            // In cloud, refresh subscription from server after login
            try {
                const res = await api.get('/auth/license/check');
                const licData = {
                    is_active: res.data.valid || res.data.is_active || true,
                    status: res.data.status || 'cloud',
                    plan: res.data.plan || 'full',
                    features: res.data.features || [],
                    message: res.data.message,
                };
                updateLicense(licData);
                return licData;
            } catch (err) {
                // Cloud fallback — keep everything unlocked
                return license;
            }
        }
        // Offline mode
        try {
            const res = await api.get('/auth/license/check');
            const licData = {
                is_active: res.data.valid,
                status: res.data.status,
                plan: res.data.plan,
                features: res.data.features || [],
                message: res.data.message,
            };
            updateLicense(licData);
            return licData;
        } catch (err) {
            console.error('License refresh failed:', err);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, login, logout, hasPermission, loading,
            license, hasFeature, updateLicense, refreshLicense,
            isCloudMode, serverStatus,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
