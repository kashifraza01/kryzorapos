import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { isCloudMode } from '../api';

const AuthContext = createContext();

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
                try {
                    setUser(JSON.parse(savedUser));
                } catch (e) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    console.warn('Cleared corrupted auth data from localStorage');
                }
            }

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
            setUser(null);
        }
    };

    const hasPermission = (permissionSlug) => {
        if (!user || !user.role || !user.role.permissions) return false;
        return user.role.permissions.some(p => p.slug === permissionSlug);
    };

    return (
        <AuthContext.Provider value={{
            user, login, logout, hasPermission, loading, isCloudMode,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
