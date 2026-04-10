import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, X, Loader2, Filter, Calendar, TrendingDown } from 'lucide-react';
import api from '../api';

const CATEGORIES = [
    { value: 'rent', label: '🏠 Rent', color: '#FF6B6B' },
    { value: 'utilities', label: '💡 Utilities', color: '#4ECDC4' },
    { value: 'salaries', label: '👥 Salaries', color: '#45B7D1' },
    { value: 'supplies', label: '📦 Supplies', color: '#96CEB4' },
    { value: 'marketing', label: '📣 Marketing', color: '#FFEAA7' },
    { value: 'maintenance', label: '🔧 Maintenance', color: '#DDA0DD' },
    { value: 'other', label: '📋 Other', color: '#B2BEC3' },
];

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({ total_expenses: 0, today_expenses: 0, by_category: [] });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [formData, setFormData] = useState({
        category: 'supplies',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const fetchData = async () => {
        try {
            const params = filterCategory !== 'all' ? `?category=${filterCategory}` : '';
            const [expRes, sumRes] = await Promise.all([
                api.get(`/expenses${params}`),
                api.get('/expenses/summary')
            ]);
            setExpenses(expRes.data);
            setSummary(sumRes.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterCategory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/expenses', formData);
            setShowModal(false);
            setFormData({ category: 'supplies', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], notes: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Error saving expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this expense?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchData();
        } catch (error) {
            alert('Error deleting expense');
        }
    };

    const getCatInfo = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[6];

    if (loading) return <div className="loading"><Loader2 className="animate-spin" /> Loading Expenses...</div>;

    return (
        <div className="expenses-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Expense Tracking</h2>
                    <p className="text-muted">Track all business expenses for true profit calculation</p>
                </div>
                <button className="add-btn" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Add Expense</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(255,107,107,0.15)' }}>
                        <TrendingDown color="#FF6B6B" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">This Month</span>
                        <h3 className="stat-value">Rs. {Number(summary.total_expenses).toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(78,205,196,0.15)' }}>
                        <Calendar color="#4ECDC4" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Today</span>
                        <h3 className="stat-value">Rs. {Number(summary.today_expenses).toLocaleString()}</h3>
                    </div>
                </div>
                {summary.by_category?.slice(0, 2).map(cat => (
                    <div className="stat-card" key={cat.category}>
                        <div className="stat-icon-wrapper" style={{ background: `${getCatInfo(cat.category).color}22` }}>
                            <DollarSign color={getCatInfo(cat.category).color} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{getCatInfo(cat.category).label}</span>
                            <h3 className="stat-value">Rs. {Number(cat.total).toLocaleString()}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Category Filter */}
            <div className="order-type-tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className={`type-btn ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')}>All</button>
                {CATEGORIES.map(cat => (
                    <button key={cat.value} className={`type-btn ${filterCategory === cat.value ? 'active' : ''}`} onClick={() => setFilterCategory(cat.value)}>
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Expense Table */}
            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No expenses recorded yet.</td></tr>
                        ) : (
                            expenses.map(exp => (
                                <tr key={exp.id}>
                                    <td>{new Date(exp.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td>
                                        <span className="status-badge" style={{ background: `${getCatInfo(exp.category).color}22`, color: getCatInfo(exp.category).color }}>
                                            {getCatInfo(exp.category).label}
                                        </span>
                                    </td>
                                    <td><strong>{exp.description}</strong></td>
                                    <td><strong style={{ color: 'var(--error)' }}>Rs. {Number(exp.amount).toLocaleString()}</strong></td>
                                    <td style={{ opacity: 0.7 }}>{exp.notes || '-'}</td>
                                    <td>
                                        <button className="icon-btn-ghost delete" onClick={() => handleDelete(exp.id)}>
                                            <Trash2 size={16} color="var(--error)" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Expense</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Category</label>
                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                    {CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <input type="text" required placeholder="e.g. Monthly electricity bill" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Amount (Rs.)</label>
                                <input type="number" required min="0" placeholder="5000" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" required value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Notes (Optional)</label>
                                <textarea placeholder="Additional details..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
