import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const emailRef = useRef(null);

    // Auto-focus email field on mount
    useEffect(() => {
        if (emailRef.current) emailRef.current.focus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(credentials);
        } catch (err) {
            console.error('[Login] Error:', err);
            if (!err.response) {
                setError('Network Error: Could not reach the server. Check your internet connection.');
            } else if (err.response.status === 401) {
                setError('Invalid email or password.');
            } else if (err.response.status === 422) {
                const msgs = err.response.data?.errors;
                setError(msgs ? Object.values(msgs).flat().join(' ') : 'Please check your input.');
            } else if (err.response.status === 429) {
                setError('Too many login attempts. Please wait a minute and try again.');
            } else {
                setError(err.response?.data?.message || `Server error (${err.response.status})`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Global Escape key to clear error
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setError('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <div className="login-logo">
                        <h1>Kryzora<span>POS</span></h1>
                    </div>
                    <p>Enter your credentials to access system</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="login-error">{error}</div>}

                    <div className="input-field">
                        <User size={18} />
                        <input
                            ref={emailRef}
                            type="email"
                            placeholder="Email Address"
                            required
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                        />
                    </div>

                    <div className="input-field">
                        <Lock size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Login to POS'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>&copy; 2026 Kryzora Solutions. All Rights Reserved.</p>
                </div>
            </div>
        </div>
    );
}
