import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [license, setLicense] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            // Ping server to ensure it is up before allowing the app to fetch data
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

            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            const savedLicense = localStorage.getItem('license');

            if (token && savedUser) {
                setUser(JSON.parse(savedUser));
            }
            if (savedLicense) {
                setLicense(JSON.parse(savedLicense));
            }

            // If no cached license, fetch from server (critical for Cloud mode first visit)
            if (!savedLicense) {
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
                    console.error('License check on init failed:', err);
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (credentials) => {
        const res = await api.post('/login', credentials);
        const { user, token, license: licenseData } = res.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');

        if (licenseData) {
            localStorage.setItem('license', JSON.stringify(licenseData));
            setLicense(licenseData);
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

    /**
     * Check if the current license allows a specific feature
     */
    const hasFeature = (featureSlug) => {
        if (!license || !license.is_active) return false;
        return (license.features || []).includes(featureSlug);
    };

    /**
     * Update the stored license data (called after activation)
     */
    const updateLicense = (licenseData) => {
        localStorage.setItem('license', JSON.stringify(licenseData));
        setLicense(licenseData);
    };

    /**
     * Refresh license from the server
     */
    const refreshLicense = async () => {
        try {
            const res = await api.get('/auth/license/check');
            const licenseData = {
                is_active: res.data.valid,
                status: res.data.status,
                plan: res.data.plan,
                features: res.data.features || [],
                message: res.data.message,
            };
            updateLicense(licenseData);
            return licenseData;
        } catch (err) {
            console.error('License refresh failed:', err);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, login, logout, hasPermission, loading,
            license, hasFeature, updateLicense, refreshLicense,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
