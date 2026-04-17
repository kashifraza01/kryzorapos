import React, { useEffect, Suspense, lazy } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext'

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

function App() {
    const { user, logout, loading: authLoading } = useAuth();

    // Loading spinner
    if (authLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: '#FF4D4D', marginBottom: '1rem' }} />
                <h2 style={{ color: '#e2e8f0', fontWeight: 700 }}>Loading KryzoraPOS...</h2>
            </div>
        );
    }

    // ============================================================
    // MAIN APP — No licensing. Direct login → Dashboard.
    // Not logged in → Login screen.
    // Logged in → Dashboard + Layout with all features unlocked.
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
                                    <Route path="/pos" element={<POS />} />
                                    <Route path="/tables" element={<Tables />} />
                                    <Route path="/inventory" element={<Inventory />} />
                                    <Route path="/menu-setup" element={<MenuSetup />} />
                                    <Route path="/customers" element={<Customers />} />
                                    <Route path="/reports" element={<Reports />} />
                                    <Route path="/staff" element={<Staff />} />
                                    <Route path="/attendance" element={<Attendance />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/kitchen" element={<Kitchen />} />
                                    <Route path="/order-history" element={<OrderHistory />} />
                                    <Route path="/expenses" element={<Expenses />} />
                                    <Route path="/suppliers" element={<Suppliers />} />
                                    <Route path="/purchases" element={<Purchases />} />
                                    <Route path="/shifts" element={<Shifts />} />
                                    <Route path="/daily-report" element={<DailyReport />} />
                                    <Route path="*" element={<Navigate to="/" />} />
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
