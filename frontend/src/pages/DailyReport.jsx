import React, { useState, useEffect } from 'react';
import api from '../api';
import {
    Calendar, DollarSign, TrendingUp, ShoppingCart,
    Wallet, CreditCard, Smartphone, FileText, Loader2, Download
} from 'lucide-react';

export default function DailyReport() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReport();
    }, [date]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/daily-closing?date=${date}`);
            setReport(res.data);
        } catch (err) {
            console.error('Failed to fetch daily report:', err);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (val) => `Rs. ${parseFloat(val || 0).toLocaleString()}`;

    if (loading) {
        return (
            <div className="shift-loading">
                <Loader2 className="animate-spin" size={32} />
                <p>Loading daily report...</p>
            </div>
        );
    }

    if (!report) {
        return <p className="empty-msg">No report data available.</p>;
    }

    return (
        <div className="daily-report">
            <div className="page-header">
                <h2><FileText size={24} /> Daily Closing Report</h2>
                <div className="report-date-picker">
                    <Calendar size={18} />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="report-cards">
                <div className="report-card">
                    <h4>Total Revenue</h4>
                    <div className="amount positive">{fmt(report.revenue.total)}</div>
                </div>
                <div className="report-card">
                    <h4>Total Orders</h4>
                    <div className="amount">{report.orders.total}</div>
                </div>
                <div className="report-card">
                    <h4>Total Expenses</h4>
                    <div className="amount negative">{fmt(report.financials.total_expenses)}</div>
                </div>
                <div className="report-card">
                    <h4>Net Revenue</h4>
                    <div className={`amount ${report.financials.net_revenue >= 0 ? 'positive' : 'negative'}`}>
                        {fmt(report.financials.net_revenue)}
                    </div>
                </div>
            </div>

            {/* Revenue by Payment Method */}
            <div className="report-breakdown">
                <h4><DollarSign size={18} /> Revenue by Payment Method</h4>
                <div className="report-row">
                    <span><Wallet size={16} /> Cash</span>
                    <span>{fmt(report.revenue.cash)}</span>
                </div>
                <div className="report-row">
                    <span><CreditCard size={16} /> Card</span>
                    <span>{fmt(report.revenue.card)}</span>
                </div>
                <div className="report-row">
                    <span><Smartphone size={16} /> EasyPaisa</span>
                    <span>{fmt(report.revenue.easypaisa)}</span>
                </div>
                <div className="report-row">
                    <span><Smartphone size={16} /> JazzCash</span>
                    <span>{fmt(report.revenue.jazzcash)}</span>
                </div>
                <div className="report-row total">
                    <span>Total</span>
                    <span>{fmt(report.revenue.total)}</span>
                </div>
            </div>

            {/* Orders Breakdown */}
            <div className="report-breakdown">
                <h4><ShoppingCart size={18} /> Orders Breakdown</h4>
                <div className="report-row">
                    <span>Dine-in</span>
                    <span>{report.orders.dine_in}</span>
                </div>
                <div className="report-row">
                    <span>Takeaway</span>
                    <span>{report.orders.takeaway}</span>
                </div>
                <div className="report-row">
                    <span>Delivery</span>
                    <span>{report.orders.delivery}</span>
                </div>
                <div className="report-row" style={{ color: 'var(--error)' }}>
                    <span>Cancelled</span>
                    <span>{report.orders.cancelled}</span>
                </div>
                <div className="report-row total">
                    <span>Total</span>
                    <span>{report.orders.total}</span>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="report-breakdown">
                <h4><TrendingUp size={18} /> Financial Summary</h4>
                <div className="report-row">
                    <span>Gross Revenue</span>
                    <span>{fmt(report.financials.gross_revenue)}</span>
                </div>
                <div className="report-row">
                    <span>Tax Collected</span>
                    <span>{fmt(report.financials.tax_collected)}</span>
                </div>
                <div className="report-row" style={{ color: 'var(--success)' }}>
                    <span>Discounts Given</span>
                    <span>- {fmt(report.financials.discounts_given)}</span>
                </div>
                <div className="report-row" style={{ color: 'var(--error)' }}>
                    <span>Expenses</span>
                    <span>- {fmt(report.financials.total_expenses)}</span>
                </div>
                <div className="report-row total">
                    <span>Net Revenue</span>
                    <span style={{ color: report.financials.net_revenue >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        {fmt(report.financials.net_revenue)}
                    </span>
                </div>
            </div>

            {/* Expense Breakdown */}
            {Object.keys(report.expenses_by_category || {}).length > 0 && (
                <div className="report-breakdown">
                    <h4><Wallet size={18} /> Expenses by Category</h4>
                    {Object.entries(report.expenses_by_category).map(([cat, amount]) => (
                        <div key={cat} className="report-row">
                            <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                            <span>{fmt(amount)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Shift Summary */}
            {report.shifts && report.shifts.length > 0 && (
                <div className="report-breakdown">
                    <h4><Calendar size={18} /> Shifts Today</h4>
                    {report.shifts.map((shift) => (
                        <div key={shift.id} className="report-row">
                            <span>
                                {shift.user || 'Unknown'} ({shift.status})
                                {shift.opened_at && ` — ${new Date(shift.opened_at).toLocaleTimeString()}`}
                                {shift.closed_at && ` to ${new Date(shift.closed_at).toLocaleTimeString()}`}
                            </span>
                            <span>
                                {shift.difference !== null && (
                                    <span style={{ color: parseFloat(shift.difference) < 0 ? 'var(--error)' : 'var(--success)' }}>
                                        Diff: {fmt(shift.difference)}
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
