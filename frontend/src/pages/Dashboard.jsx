import React, { useState, useEffect } from 'react';
import {
    Users, ShoppingBag, DollarSign, TrendingUp,
    AlertTriangle, CheckCircle2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../api';

export default function Dashboard() {
    const [stats, setStats] = useState({
        total_orders: 0,
        total_revenue: 0,
        estimated_profit: 0,
        today_expenses: 0,
        true_profit: 0,
        staff_total: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [salesChart, setSalesChart] = useState([]);
    const [topItems, setTopItems] = useState([]);
    const [inventoryAlerts, setInventoryAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurantName, setRestaurantName] = useState("KryzoraPOS");

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [summaryRes, ordersRes, salesRes, topRes, alertsRes, settingsRes] = await Promise.all([
                    api.get('/reports/daily-summary'),
                    api.get('/reports/recent-orders'),
                    api.get('/reports/weekly-sales'),
                    api.get('/reports/top-items'),
                    api.get('/inventory/alerts'),
                    api.get('/settings/public')
                ]);

                setStats(summaryRes.data);
                setRecentOrders(ordersRes.data.data || ordersRes.data);
                setSalesChart(salesRes.data);
                setTopItems(topRes.data);
                setInventoryAlerts(alertsRes.data);
                if (settingsRes.data.restaurant_name) setRestaurantName(settingsRes.data.restaurant_name);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return <div className="loading">Loading Dashboard...</div>;
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Welcome to {restaurantName}</h2>
                    <p className="text-muted">High-performance restaurant monitoring active.</p>
                </div>
                <div className="header-date">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon-wrapper sales"><DollarSign /></div>
                    <div className="stat-content">
                        <span className="stat-label">Daily Sales</span>
                        <h3 className="stat-value">Rs. {Number(stats.total_revenue).toLocaleString()}</h3>
                        <span className="stat-trend">Today</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper orders"><ShoppingBag /></div>
                    <div className="stat-content">
                        <span className="stat-label">Total Orders</span>
                        <h3 className="stat-value">{stats.total_orders}</h3>
                        <span className="stat-trend">Today</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper staff"><Users /></div>
                    <div className="stat-content">
                        <span className="stat-label">Total Staff</span>
                        <h3 className="stat-value">{stats.staff_total} Members</h3>
                        <span className="stat-trend">Roster Active</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper profit"><TrendingUp /></div>
                    <div className="stat-content">
                        <span className="stat-label">True Profit (Net)</span>
                        <h3 className="stat-value">Rs. {Number(stats.true_profit).toLocaleString()}</h3>
                        <span className="stat-trend" style={{ opacity: 0.8 }}>Gross: Rs. {Number(stats.estimated_profit).toLocaleString()}</span>
                        <span className="stat-trend down" style={{ color: 'var(--error)' }}>Exp: Rs. {Number(stats.today_expenses).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-main-grid">
                <div className="dashboard-section chart-section">
                    <div className="section-header">
                        <h4>Sales Past 30 Days</h4>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesChart}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" fontSize={11} stroke="var(--text-muted)" />
                                <YAxis fontSize={11} stroke="var(--text-muted)" />
                                <Tooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="dashboard-section chart-section">
                    <div className="section-header">
                        <h4>Top Selling Items</h4>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topItems} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                <XAxis type="number" fontSize={11} stroke="var(--text-muted)" />
                                <YAxis dataKey="item_name" type="category" width={100} fontSize={11} stroke="var(--text-muted)" />
                                <Tooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="total_qty" fill="var(--accent)" radius={[0, 4, 4, 0]} name="Qty Sold" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="dashboard-sidebar-grid">
                    <div className="dashboard-section inventory-alerts">
                        <div className="section-header">
                            <h4>Inventory Alerts</h4>
                        </div>
                        <div className="alerts-list">
                            {inventoryAlerts.length > 0 ? inventoryAlerts.map(alert => (
                                <div key={alert.id} className={`alert-item ${alert.is_critical ? 'critical' : 'low'}`}>
                                    <AlertTriangle size={18} />
                                    <div className="alert-info">
                                        <span className="alert-title">{alert.item_name}</span>
                                        <span className="alert-desc">Remaining: {alert.quantity} {alert.unit} | Min: {alert.low_stock_threshold}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="no-alerts">
                                    <CheckCircle2 size={18} color="var(--accent)" />
                                    <span>All stock levels normal</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dashboard-section recent-orders">
                        <div className="section-header">
                            <h4>Recent Orders</h4>
                        </div>
                        <div className="orders-list">
                            {recentOrders.map(order => (
                                <div key={order.id} className="order-row">
                                    <div className="order-main">
                                        <span className="order-id">#{order.id}</span>
                                        <span className="order-table">{order.table ? order.table.table_number : order.order_type}</span>
                                    </div>
                                    <div className="order-meta">
                                        <span className="order-total">Rs. {Number(order.total_amount).toLocaleString()}</span>
                                        <span className={`order-status ${(order.status || 'pending').toLowerCase()}`}>{order.status || 'Pending'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
