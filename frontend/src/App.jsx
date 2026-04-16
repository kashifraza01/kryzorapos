import React, { useEffect, Suspense, lazy } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import { Loader2, Lock, WifiOff, AlertTriangle } from 'lucide-react';
import { useAuth } from './context/AuthContext'

// Only import LicenseActivation for offline mode (lazy so it's not bundled in cloud)
const LicenseActivation = lazy(() => import('./pages/LicenseActivation'))

// Lazy-loaded pages
const POS = lazy(() => import('./pages/POS'))
const Tables = lazy(() => import('./pages/Tables'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Reports = lazy(() => import('./pages/Reports'))
const Staff = lazy(() => import('./pages/Staff'))
const Settings = lazy(() => import('./pages/Settings'))
const Kitchen = lazy(() => import('./pages/Kitchen'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MenuSetup = lazy(() => import('./pages/MenuSetup'))
const Customers = lazy(() => import('./pages/Customers'))
const OrderHistory = lazy(() => import('./pages/OrderHistory'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Attendance = lazy(() => import('./pages/Attendance'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const Purchases = lazy(() => import('./pages/Purchases'))
const Shifts = lazy(() => import('./pages/Shifts'))
const DailyReport = lazy(() => import('./pages/DailyReport'))
const PublicMenu = lazy(() => import('./pages/PublicMenu'))
const NotFound = lazy(() => import('./pages/NotFound'))

/**
 * Feature locked guard — checks subscription/license features.
 */
function FeatureLocked({ feature, children }) {
    const { hasFeature } = useAuth();
    if (hasFeature(feature)) return children;
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', gap: '1rem', opacity: 0.7
        }}>
            <Lock size={48} style={{ color: '#f59e0b' }} />
            <h2 style={{ color: '#f1f5f9', margin: 0 }}>Feature Locked</h2>
            <p style={{ color: '#94a3b8', textAlign: 'center', maxWidth: 400 }}>
                The <strong>{feature.replace(/-/g, ' ')}</strong> module is not available on your current plan.
                Please upgrade to access this feature.
            </p>
        </div>
    );
}

function App() {
    const { user, logout, loading: authLoading, license, refreshLicense, isCloudMode, serverStatus } = useAuth();

    // Refresh subscription/license on mount (if logged in)
    useEffect(() => {
        if (user) {
            refreshLicense();
        }
    }, [user]);

    // Loading spinner with server status
    if (authLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: '#FF4D4D', marginBottom: '1rem' }} />
                <h2 style={{ color: '#e2e8f0', fontWeight: 700 }}>Loading KryzoraPOS...</h2>
                {serverStatus === 'connecting' && (
                    <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Connecting to server...</p>
                )}
                {serverStatus === 'offline' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                        <WifiOff size={18} />
                        <span>Server offline - working in offline mode</span>
                    </div>
                )}
            </div>
        );
    }

    // ============================================================
    // OFFLINE MODE ONLY: If no valid license → show LicenseActivation.
    // CLOUD MODE: This block is COMPLETELY SKIPPED. Always go to Login.
    // ============================================================
    if (!isCloudMode && !user && (!license || !license.is_active)) {
        return (
            <Router>
                <Routes>
                    <Route path="/menu" element={<Suspense fallback={null}><PublicMenu /></Suspense>} />
                    <Route path="*" element={
                        <Suspense fallback={null}>
                            <LicenseActivation onActivated={(licData) => {
                                localStorage.setItem('license', JSON.stringify({
                                    is_active: licData.valid || licData.is_active || true,
                                    status: licData.status || 'active',
                                    plan: licData.plan,
                                    features: licData.features || [],
                                    message: licData.message || 'License active',
                                }));
                                window.location.reload();
                            }} />
                        </Suspense>
                    } />
                </Routes>
            </Router>
        );
    }

    // ============================================================
    // MAIN APP — Both cloud and offline land here.
    // Not logged in → Login screen.
    // Logged in → Dashboard + Layout.
    // ============================================================
    return (
        <Router>
            <Routes>
                <Route path="/menu" element={<Suspense fallback={null}><PublicMenu /></Suspense>} />
                <Route path="*" element={
                    !user ? (
                        <Login />
                    ) : (
                        <Layout onLogout={logout}>
                            <Suspense fallback={<div className="loading"><Loader2 className="animate-spin" size={32} /> Loading...</div>}>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/pos" element={<FeatureLocked feature="pos"><POS /></FeatureLocked>} />
                                    <Route path="/tables" element={<FeatureLocked feature="tables"><Tables /></FeatureLocked>} />
                                    <Route path="/inventory" element={<FeatureLocked feature="inventory"><Inventory /></FeatureLocked>} />
                                    <Route path="/menu-setup" element={<FeatureLocked feature="menu-setup"><MenuSetup /></FeatureLocked>} />
                                    <Route path="/customers" element={<FeatureLocked feature="customers"><Customers /></FeatureLocked>} />
                                    <Route path="/reports" element={<FeatureLocked feature="reports"><Reports /></FeatureLocked>} />
                                    <Route path="/staff" element={<FeatureLocked feature="staff"><Staff /></FeatureLocked>} />
                                    <Route path="/attendance" element={<FeatureLocked feature="attendance"><Attendance /></FeatureLocked>} />
                                    <Route path="/settings" element={<FeatureLocked feature="settings"><Settings /></FeatureLocked>} />
                                    <Route path="/kitchen" element={<FeatureLocked feature="kitchen"><Kitchen /></FeatureLocked>} />
                                    <Route path="/order-history" element={<FeatureLocked feature="order-history"><OrderHistory /></FeatureLocked>} />
                                    <Route path="/expenses" element={<FeatureLocked feature="expenses"><Expenses /></FeatureLocked>} />
                                    <Route path="/suppliers" element={<FeatureLocked feature="suppliers"><Suppliers /></FeatureLocked>} />
                                    <Route path="/purchases" element={<FeatureLocked feature="purchases"><Purchases /></FeatureLocked>} />
                                    <Route path="/shifts" element={<FeatureLocked feature="pos"><Shifts /></FeatureLocked>} />
                                    <Route path="/daily-report" element={<FeatureLocked feature="reports"><DailyReport /></FeatureLocked>} />
                                    <Route path="/404" element={<NotFound />} />
                                    <Route path="*" element={<Navigate to="/404" replace />} />
                                </Routes>
                            </Suspense>
                        </Layout>
                    )
                } />
            </Routes>
        </Router>
    )
}

export default App
