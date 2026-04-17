import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Utensils,
    Table2,
    Package,
    Users,
    Settings,
    PieChart,
    ChefHat,
    LogOut,
    Moon,
    Sun,
    Search,
    Bell,
    List,
    UserRound,
    ClipboardList,
    Wallet,
    UserCheck,
    Sparkles,
    Clock,
    ShoppingCart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useKeyboardShortcuts } from '../utils/useKeyboardShortcuts';

const SidebarItem = ({ icon: Icon, label, to, active, show = true }) => {
    if (!show) return null;
    return (
        <Link to={to} className={`sidebar-item ${active ? 'active' : ''}`}>
            <Icon size={24} />
            <span>{label}</span>
        </Link>
    );
};

export default function Layout({ children, onLogout }) {
    const location = useLocation();
    const { hasPermission, hasFeature, user: authUser } = useAuth();
    useKeyboardShortcuts(); // Global Enter/Esc support for all modals
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('pos-theme');
        return saved ? saved === 'dark' : true;
    });
    const [restaurantName, setRestaurantName] = useState('KryzoraPOS');
    const [alertsCount, setAlertsCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        const fetchLayoutData = async () => {
            try {
                const [settingsRes, alertsRes] = await Promise.all([
                    api.get('/settings/public'),
                    api.get('/inventory/alerts')
                ]);
                if (settingsRes.data.restaurant_name) setRestaurantName(settingsRes.data.restaurant_name);
                setAlertsCount(alertsRes.data.length);
            } catch (err) {
                console.error('Failed to fetch layout data', err);
            }
        };
        fetchLayoutData();
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        localStorage.setItem('pos-theme', newTheme ? 'dark' : 'light');
    };

    const userName = authUser?.name || 'Admin';
    const userRole = authUser?.role?.name || 'Manager';
    const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="layout" data-theme={isDark ? 'dark' : 'light'}>
            {/* Mobile Overlay */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo">
                    <div className="logo-icon">K</div>
                    <span className="logo-text">{restaurantName}</span>
                </div>

                <nav className="sidebar-nav">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" active={location.pathname === '/'} />
                    <SidebarItem icon={Utensils} label="POS" to="/pos" active={location.pathname === '/pos'} show={hasPermission('take-orders') && hasFeature('pos')} />
                    <SidebarItem icon={Table2} label="Tables" to="/tables" active={location.pathname === '/tables'} show={hasPermission('take-orders') && hasFeature('tables')} />
                    <SidebarItem icon={Package} label="Inventory" to="/inventory" active={location.pathname === '/inventory'} show={hasPermission('manage-inventory') && hasFeature('inventory')} />
                    <SidebarItem icon={List} label="Menu Setup" to="/menu-setup" active={location.pathname === '/menu-setup'} show={hasPermission('manage-menu') && hasFeature('menu-setup')} />
                    <SidebarItem icon={PieChart} label="Reports" to="/reports" active={location.pathname === '/reports'} show={hasPermission('view-reports') && hasFeature('reports')} />
                    <SidebarItem icon={Users} label="Customers" to="/customers" active={location.pathname === '/customers'} show={hasPermission('take-orders') && hasFeature('pos')} />
                    <SidebarItem icon={UserRound} label="Staff" to="/staff" active={location.pathname === '/staff'} show={hasPermission('manage-staff') && hasFeature('staff')} />
                    <SidebarItem icon={UserCheck} label="Attendance" to="/attendance" active={location.pathname === '/attendance'} show={hasFeature('attendance')} />
                    <SidebarItem icon={ChefHat} label="Kitchen" to="/kitchen" active={location.pathname === '/kitchen'} show={hasFeature('kitchen')} />
                    <SidebarItem icon={Clock} label="Order History" to="/order-history" active={location.pathname === '/order-history'} show={hasFeature('order-history')} />
                    <SidebarItem icon={Sparkles} label="Shifts" to="/shifts" active={location.pathname === '/shifts'} show={hasFeature('pos')} />
                    <SidebarItem icon={Wallet} label="Expenses" to="/expenses" active={location.pathname === '/expenses'} show={hasPermission('view-reports') && hasFeature('expenses')} />
                    <SidebarItem icon={ClipboardList} label="Daily Report" to="/daily-report" active={location.pathname === '/daily-report'} show={hasPermission('view-reports') && hasFeature('reports')} />
                    <SidebarItem icon={Users} label="Suppliers" to="/suppliers" active={location.pathname === '/suppliers'} show={hasPermission('manage-inventory') && hasFeature('suppliers')} />
                    <SidebarItem icon={ShoppingCart} label="Stock Purchases" to="/purchases" active={location.pathname === '/purchases'} show={hasPermission('manage-inventory') && hasFeature('purchases')} />
                </nav>

                <div className="sidebar-footer">
                    <SidebarItem icon={Settings} label="Settings" to="/settings" active={location.pathname === '/settings'} />
                    <button className="sidebar-item logout-btn" onClick={onLogout}>
                        <LogOut size={24} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="header" style={{ padding: '0.75rem 1.5rem' }}>
                    <button className="menu-toggle" onClick={toggleSidebar}>
                        <List size={24} />
                    </button>
                    <div className="search-bar">
                        <Search size={20} />
                        <input type="text" placeholder="Search menu or orders..." />
                    </div>

                    <div className="header-actions">
                        <button className="icon-button" onClick={toggleTheme}>
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="icon-button" title={`${alertsCount} Inventory Alerts`}>
                            <Bell size={20} />
                            {alertsCount > 0 && <span className="notification-badge">{alertsCount}</span>}
                        </button>
                        <div className="user-profile">
                            <div className="user-avatar">{initials}</div>
                            <div className="user-info">
                                <span className="user-name">{userName}</span>
                                <span className="user-role" style={{ textTransform: 'capitalize' }}>{userRole}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="page-container" style={{ padding: '1.5rem', overflow: 'auto', height: 'calc(100vh - 72px)' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
