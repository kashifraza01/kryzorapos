import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Printer, DollarSign, Globe, Bell, Lock, Database, Download, User, Info, PhoneCall, CreditCard, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const { license, refreshLicense } = useAuth();
    const [newLicenseKey, setNewLicenseKey] = useState('');
    const [activating, setActivating] = useState(false);

    const tabs = [
        { id: 'general', name: 'General', icon: Globe },
        { id: 'billing', name: 'Billing & Tax', icon: DollarSign },
        { id: 'printing', name: 'Printing', icon: Printer },
        { id: 'payments', name: 'Payments', icon: CreditCard },
        { id: 'database', name: 'Backup', icon: Database },
        { id: 'license', name: 'License', icon: Key },
        { id: 'about', name: 'About', icon: Info },
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            await api.post('/settings', settings);
            setMessage({ text: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (err) {
            setMessage({ text: 'Failed to save settings.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleBackup = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8111/api/system/backup', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kryzorapos_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            alert('Backup failed: ' + error.message);
        }
    };

    const handleActivateLicense = async (e) => {
        e.preventDefault();
        if (!newLicenseKey) return;
        setActivating(true);
        try {
            await api.post('/auth/license/activate', { license_key: newLicenseKey });
            setMessage({ text: 'License activated successfully! Reloading...', type: 'success' });
            await refreshLicense();
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            setMessage({ text: err.response?.data?.error || 'Invalid license key', type: 'error' });
        } finally {
            setActivating(false);
        }
    };

    if (loading) return <div className="loading">Loading Settings...</div>;

    return (
        <div className="settings-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>System Settings</h2>
                    <p className="text-muted">Configure your POS system preferences</p>
                </div>
                {message.text && (
                    <div className={`pos-toast ${message.type}`} style={{ position: 'static', marginBottom: '1rem' }}>
                        {message.text}
                    </div>
                )}
            </div>

            <div className="settings-container">
                <aside className="settings-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={18} />
                            <span>{tab.name}</span>
                        </button>
                    ))}
                </aside>

                <main className="settings-content">
                    <form onSubmit={handleSave}>
                        {activeTab === 'general' && (
                            <div className="settings-section">
                                <h3>General Configuration</h3>
                                <div className="form-group">
                                    <label>Restaurant Name</label>
                                    <input
                                        type="text"
                                        value={settings.restaurant_name || ''}
                                        onChange={(e) => handleChange('restaurant_name', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <textarea
                                        value={settings.restaurant_address || ''}
                                        onChange={(e) => handleChange('restaurant_address', e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        value={settings.restaurant_phone || ''}
                                        onChange={(e) => handleChange('restaurant_phone', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Currency Symbol</label>
                                    <input
                                        type="text"
                                        value={settings.currency || 'Rs.'}
                                        onChange={(e) => handleChange('currency', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Receipt Footer Credit</label>
                                    <input
                                        type="text"
                                        value={settings.footer_text || ''}
                                        onChange={(e) => handleChange('footer_text', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="settings-section">
                                <h3>Billing & Taxation</h3>
                                <div className="form-group">
                                    <label>GST Rate (%)</label>
                                    <input
                                        type="number"
                                        value={settings.tax_rate || 0}
                                        onChange={(e) => handleChange('tax_rate', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Service Charges (Fixed Rs.)</label>
                                    <input
                                        type="number"
                                        value={settings.service_charge || 0}
                                        onChange={(e) => handleChange('service_charge', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Delivery Charges (Fixed Rs.)</label>
                                    <input
                                        type="number"
                                        value={settings.delivery_charge || 0}
                                        onChange={(e) => handleChange('delivery_charge', e.target.value)}
                                    />
                                </div>
                                <hr className="my-4" />
                                <div className="fbr-integration-section">
                                    <h4 className="font-bold flex items-center gap-2 mb-2">
                                        <Bell size={16} className="text-primary" />
                                        FBR Integration (Pakistan)
                                    </h4>
                                    <div className="checkbox-group mb-3">
                                        <input
                                            type="checkbox"
                                            id="fbr-enabled"
                                            checked={settings.fbr_enabled === 'true' || settings.fbr_enabled === true}
                                            onChange={(e) => handleChange('fbr_enabled', e.target.checked)}
                                        />
                                        <label htmlFor="fbr-enabled">Enable FBR POS Integration</label>
                                    </div>
                                    <div className="form-group">
                                        <label>FBR POS ID</label>
                                        <input
                                            type="text"
                                            placeholder="Enter 11-digit POS ID"
                                            value={settings.fbr_pos_id || ''}
                                            onChange={(e) => handleChange('fbr_pos_id', e.target.value)}
                                            disabled={!(settings.fbr_enabled === 'true' || settings.fbr_enabled === true)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'printing' && (
                            <div className="settings-section">
                                <h3>Printing Preferences</h3>
                                <div className="form-group">
                                    <label>Primary Printer</label>
                                    <select defaultValue="auto">
                                        <option value="auto">Auto-Detect Thermal (USB/LAN)</option>
                                        <option value="default">System Default</option>
                                    </select>
                                </div>
                                <div className="checkbox-group">
                                    <input type="checkbox" id="auto-print" defaultChecked />
                                    <label htmlFor="auto-print">Auto-print receipt after order completion</label>
                                </div>
                                <div className="checkbox-group">
                                    <input type="checkbox" id="kot-print" defaultChecked />
                                    <label htmlFor="kot-print">Print KOT automatically</label>
                                </div>
                            </div>
                        )}

                        {activeTab === 'payments' && (
                            <div className="settings-section">
                                <h3>Mobile Payments</h3>
                                <p className="text-sm text-muted mb-4">Numbers entered here will be used to generate QR codes on the POS screen.</p>
                                <div className="form-group">
                                    <label>JazzCash Number</label>
                                    <input
                                        type="text"
                                        placeholder="03XXXXXXXXX"
                                        value={settings.jazzcash_no || ''}
                                        onChange={(e) => handleChange('jazzcash_no', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Easypaisa Number</label>
                                    <input
                                        type="text"
                                        placeholder="03XXXXXXXXX"
                                        value={settings.easypaisa_no || ''}
                                        onChange={(e) => handleChange('easypaisa_no', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'database' && (
                            <div className="settings-section">
                                <h3>Database & Backup</h3>
                                <div className="backup-card p-4 border rounded-lg bg-surface flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold">Manual Data Export</h4>
                                        <p className="text-sm text-muted">Generate a full snapshot of your POS database.</p>
                                    </div>
                                    <button type="button" className="add-btn flex items-center gap-2" onClick={handleBackup}>
                                        <Download size={18} />
                                        <span>Download SQLITE</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'license' && (
                            <div className="settings-section">
                                <h3>License Status</h3>
                                <div className="about-card p-6 border rounded-xl bg-gradient-to-br from-primary/5 to-transparent mb-6">
                                    <h4 className="font-bold mb-2">Current Plan: {license?.plan ? license.plan.toUpperCase() : 'UNKNOWN'}</h4>
                                    <p className="text-sm font-medium">Status: <span className={license?.is_active ? 'text-success' : 'text-error'}>{license?.status || 'Inactive'}</span></p>
                                    <p className="text-sm font-medium text-muted">Expires: {license?.expiry_date || 'N/A'}</p>
                                    <p className="text-sm font-medium text-muted">Features: {(license?.features || []).join(', ')}</p>
                                </div>

                                <h3>Upgrade License</h3>
                                <p className="text-sm text-muted mb-4">Enter a new license key to upgrade your plan or extend validity.</p>
                                <div className="form-group">
                                    <label>License Key</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. KRYZORA-LIFETIME-VIP"
                                        value={newLicenseKey}
                                        onChange={(e) => setNewLicenseKey(e.target.value)}
                                    />
                                </div>
                                <button type="button" className="add-btn" onClick={handleActivateLicense} disabled={activating || !newLicenseKey}>
                                    {activating ? 'Activating...' : 'Activate Key'}
                                </button>
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div className="settings-section">
                                <h3>About Software</h3>
                                <div className="about-card p-6 border rounded-xl bg-gradient-to-br from-primary/5 to-transparent">
                                    <h4 className="text-xl font-bold mb-2">KryzoraPOS v2.0</h4>
                                    <p className="mb-4 text-muted">{settings.about_software || 'Professional POS Solution by Kryzora Solutions.'}</p>
                                    <div className="border-t pt-4">
                                        <p className="flex items-center gap-2 text-sm font-medium">
                                            <User size={16} className="text-primary" />
                                            Developer: Kryzora Solutions
                                        </p>
                                        <p className="flex items-center gap-2 text-sm font-medium mt-1">
                                            <PhoneCall size={16} className="text-green-500" />
                                            Contact: 03202091747
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab !== 'database' && activeTab !== 'about' && activeTab !== 'license' && (
                            <button type="submit" className="save-btn" disabled={saving}>
                                {saving ? 'Saving...' : 'Save All Changes'}
                            </button>
                        )}
                    </form>
                </main>
            </div>
        </div>
    );
}
