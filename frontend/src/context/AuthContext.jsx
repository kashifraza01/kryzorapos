import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { isCloudMode } from '../api';

// ALL FEATURES - always available in cloud mode
const CLOUD_FEATURES = [
    'pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
    'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
    'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
    'settings', 'dashboard-full'
];

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [license, setLicense] = useState(null);
    const [serverStatus, setServerStatus] = useState('connecting');

    useEffect(() => {
        const initAuth = async () => {
            console.log('=== INIT AUTH ===');
            console.log('isCloudMode:', isCloudMode);
            console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
            
            // Ping server to ensure it is up
            let retries = 0;
            const maxRetries = 5;
            
            while (retries < maxRetries) {
                try {
                    await api.get('/settings/public');
                    setServerStatus('online');
                    console.log('Server is ONLINE');
                    break;
                } catch (e) {
                    retries++;
                    if (retries >= maxRetries) {
                        setServerStatus('offline');
                        console.warn('Server unreachable');
                    } else {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            // Check for saved auth
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                setUser(JSON.parse(savedUser));
            }

            // ============================================================
            // CLOUD MODE: ALWAYS grant all features
            // ============================================================
            if (isCloudMode) {
                console.log('Setting CLOUD license with ALL features');
                const cloudLicense = {
                    is_active: true,
                    status: 'cloud',
                    plan: 'full',
                    features: CLOUD_FEATURES,
                    message: 'Cloud mode - all features unlocked',
                };
                setLicense(cloudLicense);
                localStorage.setItem('license', JSON.stringify(cloudLicense));
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

            console.log('Auth initialization complete');
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

        // ALWAYS grant full features in cloud mode
        if (isCloudMode) {
            const fullLicense = {
                is_active: true,
                status: 'cloud',
                plan: 'full',
                features: CLOUD_FEATURES,
                message: 'Cloud mode - all features unlocked',
            };
            localStorage.setItem('license', JSON.stringify(fullLicense));
            setLicense(fullLicense);
        } else if (licData) {
            localStorage.setItem('license', JSON.stringify(licData));
            setLicense(licData);
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
        console.log('hasPermission:', permissionSlug, 'user:', user?.role);
        if (!user) return false;
        
        // In cloud mode, admin has all permissions
        if (isCloudMode && user.role?.name === 'Administrator') {
            return true;
        }
        
        if (!user.role || !user.role.permissions) return false;
        return user.role.permissions.some(p => p.slug === permissionSlug);
    };

    const hasFeature = (featureSlug) => {
        console.log('hasFeature:', featureSlug, 'license:', license);
        if (!license || !license.is_active) return false;
        return (license.features || []).includes(featureSlug);
    };

    const updateLicense = (licenseData) => {
        localStorage.setItem('license', JSON.stringify(licenseData));
        setLicense(licenseData);
    };

    const refreshLicense = async () => {
        // ALWAYS grant full features in cloud mode
        if (isCloudMode) {
            const fullLicense = {
                is_active: true,
                status: 'cloud',
                plan: 'full',
                features: CLOUD_FEATURES,
                message: 'Cloud mode - all features unlocked',
            };
            updateLicense(fullLicense);
            return fullLicense;
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
