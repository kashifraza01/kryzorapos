import React, { useState } from 'react';
import { Lock, User, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(credentials);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="text-center mt-4">
                        <p className="text-xs text-muted" style={{ opacity: 0.7 }}>Default: <strong>admin@kryzorapos.com</strong> / <strong>password</strong></p>
                    </div>
                </form>

                <div className="login-footer">
                    <p>&copy; 2026 Kryzora Solutions. All Rights Reserved.</p>
                </div>
            </div>
        </div>
    );
}
