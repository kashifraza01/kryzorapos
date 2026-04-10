import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, BarChart3, Loader2, Download, Cloud, MonitorSmartphone } from 'lucide-react';
import api from '../api';

export default function Reports() {
    const [stats, setStats] = useState({
        total_revenue: 0,
        total_orders: 0,
        avg_order_value: 0,
        estimated_profit: 0,
        today_expenses: 0,
        true_profit: 0
    });
    const [salesChart, setSalesChart] = useState([]);
    const [topItems, setTopItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const [summaryRes, salesRes, itemsRes] = await Promise.all([
                    api.get('/reports/daily-summary'),
                    api.get('/reports/weekly-sales'),
                    api.get('/reports/top-items')
                ]);

                setStats({
                    total_revenue: summaryRes.data.total_revenue,
                    total_orders: summaryRes.data.total_orders,
                    estimated_profit: summaryRes.data.estimated_profit,
                    today_expenses: summaryRes.data.today_expenses,
                    true_profit: summaryRes.data.true_profit,
                    avg_order_value: summaryRes.data.total_orders > 0
                        ? (summaryRes.data.total_revenue / summaryRes.data.total_orders).toFixed(0)
                        : 0
                });
                setSalesChart(salesRes.data);
                setTopItems(itemsRes.data);
            } catch (error) {
                console.error('Error fetching reports:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await api.get('/reports/export-csv', { responseType: 'blob' });
            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Please check if the server is running.');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <div className="loading"><Loader2 className="animate-spin" /> Generating Reports...</div>;
    }

    return (
        <div className="reports-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Sales Analytics</h2>
                    <p className="text-muted">Monitor your business performance with real-time data</p>
                </div>
                <div className="flex gap-2">
                    <button className="add-btn flex items-center gap-2" onClick={handleExport} disabled={exporting} style={{ background: 'var(--success)' }}>
                        <Download size={18} />
                        <span>{exporting ? 'Exporting...' : 'Export to Excel'}</span>
                    </button>
                </div>
            </div>

            {/* Quick Tips / Integration Cards */}
            <div className="stats-grid mb-6">
                <div className="stat-card" style={{ background: 'var(--surface)', border: '1px dashed var(--primary)', cursor: 'default' }}>
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(52,152,219,0.1)' }}>
                        <MonitorSmartphone color="#3498db" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Mobile Access</span>
                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Open your IP in mobile Safari/Chrome</h4>
                    </div>
                </div>
                <div className="stat-card" style={{ background: 'var(--surface)', border: '1px dashed var(--success)', cursor: 'default' }}>
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(46,204,113,0.1)' }}>
                        <Cloud color="#2ecc71" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Cloud Backup</span>
                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Weekly auto-backup active</h4>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="report-card">
                    <div className="card-header-flex">
                        <div>
                            <span className="card-label">Total Revenue</span>
                            <h3 className="card-value">Rs. {Number(stats.total_revenue).toLocaleString()}</h3>
                        </div>
                        <div className="card-icon-bg revenue"><DollarSign size={20} /></div>
                    </div>
                    <div className="card-trend up">
                        <TrendingUp size={14} />
                        <span>Today</span>
                    </div>
                </div>

                <div className="report-card">
                    <div className="card-header-flex">
                        <div>
                            <span className="card-label">Total Orders</span>
                            <h3 className="card-value">{stats.total_orders}</h3>
                        </div>
                        <div className="card-icon-bg orders"><ShoppingBag size={20} /></div>
                    </div>
                    <div className="card-trend up">
                        <TrendingUp size={14} />
                        <span>Today</span>
                    </div>
                </div>

                <div className="report-card">
                    <div className="card-header-flex">
                        <div>
                            <span className="card-label">Net Profit (True)</span>
                            <h3 className="card-value profit-text">Rs. {Number(stats.true_profit).toLocaleString()}</h3>
                        </div>
                        <div className="card-icon-bg profit"><TrendingUp size={20} /></div>
                    </div>
                    <div className="card-trend up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}><strong style={{ color: 'var(--success)' }}>Gross:</strong> Rs. {Number(stats.estimated_profit).toLocaleString()}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}><strong style={{ color: 'var(--error)' }}>Exp:</strong> Rs. {Number(stats.today_expenses).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-container">
                    <div className="chart-header">
                        <h4>Daily Sales Trend (Last 7 Days)</h4>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={salesChart}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF4D4D" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#FF4D4D" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip />
                                <Area type="monotone" dataKey="sales" stroke="#FF4D4D" fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-container">
                    <div className="chart-header">
                        <h4>Top 5 Selling Items</h4>
                    </div>
                    <div className="chart-body">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topItems.slice(0, 5)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                                <XAxis type="number" stroke="var(--text-muted)" hide />
                                <YAxis dataKey="item_name" type="category" stroke="var(--text-muted)" width={120} fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="total_qty" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="report-table-section chart-container mt-6">
                <div className="chart-header">
                    <h4>Profit/Loss Breakdown by Item</h4>
                </div>
                <div className="chart-body" style={{ overflowX: 'auto' }}>
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Sales Qty</th>
                                <th>Revenue</th>
                                <th>Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topItems.map(item => (
                                <tr key={item.item_name}>
                                    <td><span className="item-name-cell">{item.item_name}</span></td>
                                    <td>{item.total_qty}</td>
                                    <td>Rs. {Number(item.total_revenue).toLocaleString()}</td>
                                    <td><span className="status-badge ok">Rs. {Number(item.total_profit).toLocaleString()}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
