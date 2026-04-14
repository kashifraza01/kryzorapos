import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle2, XCircle, Loader2, Star, Zap, Crown } from 'lucide-react';
import api from '../api';

const PLAN_ICONS = {
    sales: <Zap size={28} />,
    sales_inventory: <Star size={28} />,
    full: <Crown size={28} />,
};

const PLAN_COLORS = {
    sales: '#3b82f6',
    sales_inventory: '#8b5cf6',
    full: '#f59e0b',
};

export default function LicenseActivation({ onActivated }) {
    const [licenseKey, setLicenseKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [licenseInfo, setLicenseInfo] = useState(null);
    const [plans, setPlans] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        checkLicense();
    }, []);

    const checkLicense = async () => {
        setChecking(true);
        try {
            const res = await api.get('/auth/license/check');
            setLicenseInfo(res.data);
            setPlans(res.data.plans || []);
            if (res.data.valid && onActivated) {
                onActivated(res.data);
            }
        } catch (err) {
            console.error('License check failed:', err);
        } finally {
            setChecking(false);
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        if (!licenseKey.trim()) return;

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await api.post('/auth/license/activate', { license_key: licenseKey });
            setMessage(res.data.message);
            setLicenseKey('');
            // Recheck after activation
            setTimeout(() => checkLicense(), 500);
        } catch (err) {
            setError(err.response?.data?.message || 'Activation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="license-screen">
                <div className="license-loading">
                    <Loader2 className="animate-spin" size={48} />
                    <p>Checking license...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="license-screen">
            <div className="license-container">
                {/* Header */}
                <div className="license-header">
                    <div className="license-logo">
                        <Shield size={48} />
                    </div>
                    <h1>KryzoraPOS</h1>
                    <p className="license-subtitle">by Kryzora Solutions</p>
                </div>

                {/* Current Status */}
                {licenseInfo && (
                    <div className={`license-status-card ${licenseInfo.status}`}>
                        {licenseInfo.valid ? (
                            <CheckCircle2 size={24} />
                        ) : (
                            <XCircle size={24} />
                        )}
                        <div>
                            <strong>
                                {licenseInfo.status === 'active' && '✅ License Active'}
                                {licenseInfo.status === 'grace' && '⚠️ Grace Period'}
                                {licenseInfo.status === 'expired' && '❌ License Expired'}
                                {licenseInfo.status === 'inactive' && '🔒 No License'}
                            </strong>
                            <p>{licenseInfo.message}</p>
                            {licenseInfo.plan && (
                                <span className="plan-badge" style={{ background: PLAN_COLORS[licenseInfo.plan] }}>
                                    {licenseInfo.plan === 'sales' && 'Sales Plan'}
                                    {licenseInfo.plan === 'sales_inventory' && 'Sales + Inventory'}
                                    {licenseInfo.plan === 'full' && 'Full Suite'}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Activation Form */}
                <form onSubmit={handleActivate} className="license-form">
                    <div className="license-input-group">
                        <Key size={20} />
                        <input
                            type="text"
                            placeholder="Enter your license key (e.g. KRYZORA-FULL-ANNUAL)"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="license-btn" disabled={loading || !licenseKey.trim()}>
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
                        {loading ? 'Activating...' : 'Activate License'}
                    </button>
                </form>

                {message && <div className="license-msg success">{message}</div>}
                {error && <div className="license-msg error">{error}</div>}

                {/* Plans Pricing */}
                <div className="license-plans">
                    <h3>Available Plans</h3>
                    <div className="plans-grid">
                        {plans.map((plan) => (
                            <div key={plan.slug} className="plan-card" style={{ borderColor: PLAN_COLORS[plan.slug] }}>
                                <div className="plan-icon" style={{ color: PLAN_COLORS[plan.slug] }}>
                                    {PLAN_ICONS[plan.slug]}
                                </div>
                                <h4>{plan.name}</h4>
                                <div className="plan-price">
                                    <span className="currency">Rs.</span>
                                    <span className="amount">{(plan.price || 0).toLocaleString()}</span>
                                    <span className="period">/mo</span>
                                </div>
                                <ul className="plan-features">
                                    {plan.features.map((f) => (
                                        <li key={f}>
                                            <CheckCircle2 size={14} />
                                            {f.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact */}
                <div className="license-footer">
                    <p>Need a license? Contact Kryzora Solutions</p>
                    <p className="contact-info">📞 0300-XXXXXXX &nbsp;|&nbsp; 📧 sales@kryzora.com</p>
                </div>
            </div>
        </div>
    );
}
