import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { isCloudMode } from '../api';

// ALL FEATURES - always available in cloud mode
const CLOUD_FEATURES = [
    'pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
    'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
    'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
    'settings', 'dashboard-full'
];

// Create cloud license object
const createCloudLicense = () => ({
    is_active: true,
    status: 'cloud',
    plan: 'full',
    features: CLOUD_FEATURES,
    message: 'Cloud mode - all features unlocked',
});

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [license, setLicense] = useState(null);
    const [serverStatus, setServerStatus] = useState('connecting');

    useEffect(() => {
        const initAuth = async () => {
            // Check server connectivity
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
                    } else {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            // Check for saved auth
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (e) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }

            // CLOUD MODE: Always grant all features
            if (isCloudMode) {
                // Check if we have a saved license with features
                const savedLicense = localStorage.getItem('license');
                let parsedLicense = null;
                if (savedLicense) {
                    try {
                        parsedLicense = JSON.parse(savedLicense);
                    } catch (e) {}
                }
                
                // If no saved license or not full features, create new one
                if (!parsedLicense || !parsedLicense.features || parsedLicense.features.length < 10) {
                    const cloudLicense = createCloudLicense();
                    localStorage.setItem('license', JSON.stringify(cloudLicense));
                    setLicense(cloudLicense);
                } else {
                    setLicense(parsedLicense);
                }
            } else {
                // OFFLINE: Use saved license or fetch from server
                const savedLicense = localStorage.getItem('license');
                if (savedLicense) {
                    try {
                        setLicense(JSON.parse(savedLicense));
                    } catch (e) {}
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

        // ALWAYS grant full features in cloud mode
        let finalLicense;
        if (isCloudMode) {
            finalLicense = createCloudLicense();
        } else if (licData) {
            finalLicense = licData;
        } else {
            finalLicense = { is_active: false, status: 'no_license', plan: null, features: [] };
        }
        
        localStorage.setItem('license', JSON.stringify(finalLicense));
        setLicense(finalLicense);
        setUser(user);
        
        return user;
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (err) {
            // Ignore logout errors
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('license');
            setUser(null);
            setLicense(null);
        }
    };

    // Cloud mode: always return true for hasPermission
    const hasPermission = (permissionSlug) => {
        if (isCloudMode) return true;
        if (!user) return false;
        if (!user.role || !user.role.permissions) return false;
        return user.role.permissions.some(p => p.slug === permissionSlug);
    };

    // Cloud mode: always return true for hasFeature
    const hasFeature = (featureSlug) => {
        if (isCloudMode) return true;
        if (!license || !license.is_active) return false;
        return (license.features || []).includes(featureSlug);
    };

    const updateLicense = (licenseData) => {
        localStorage.setItem('license', JSON.stringify(licenseData));
        setLicense(licenseData);
    };

    // Cloud mode: always return full features
    const refreshLicense = async () => {
        if (isCloudMode) {
            const cloudLicense = createCloudLicense();
            updateLicense(cloudLicense);
            return cloudLicense;
        }
        
        try {
            const res = await api.get('/auth/license/check');
            const licData = res.data;
            updateLicense(licData);
            return licData;
        } catch (err) {
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
