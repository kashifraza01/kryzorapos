import React, { useState, useEffect } from 'react';
import api from '../api';
import {
    Clock, Play, Square, DollarSign, TrendingUp, AlertTriangle,
    Calendar, User, ChevronDown, ChevronUp, Loader2, CheckCircle2
} from 'lucide-react';

export default function Shifts() {
    const [currentShift, setCurrentShift] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openingBalance, setOpeningBalance] = useState('');
    const [actualCash, setActualCash] = useState('');
    const [closeNote, setCloseNote] = useState('');
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedShift, setExpandedShift] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [currentRes, historyRes] = await Promise.all([
                api.get('/shifts/current'),
                api.get('/shifts'),
            ]);
            setCurrentShift(currentRes.data.shift);
            setShifts(historyRes.data);
        } catch (err) {
            console.error('Failed to fetch shifts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenShift = async () => {
        if (!openingBalance || parseFloat(openingBalance) < 0) return;
        setSubmitting(true);
        try {
            const res = await api.post('/shifts/open', {
                opening_balance: parseFloat(openingBalance),
            });
            setCurrentShift(res.data.shift);
            setOpeningBalance('');
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to open shift');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseShift = async () => {
        if (!actualCash || parseFloat(actualCash) < 0) return;
        setSubmitting(true);
        try {
            await api.post('/shifts/close', {
                actual_cash: parseFloat(actualCash),
                note: closeNote,
            });
            setCurrentShift(null);
            setActualCash('');
            setCloseNote('');
            setShowCloseForm(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to close shift');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val) => `Rs. ${parseFloat(val || 0).toLocaleString()}`;

    if (loading) {
        return (
            <div className="shift-loading">
                <Loader2 className="animate-spin" size={32} />
                <p>Loading shifts...</p>
            </div>
        );
    }

    return (
        <div className="shifts-page">
            <div className="page-header">
                <h2><Clock size={24} /> Shift Management</h2>
            </div>

            {/* Current Shift Status */}
            {currentShift ? (
                <div className="shift-active-card">
                    <div className="shift-active-header">
                        <div className="shift-active-status">
                            <div className="shift-pulse" />
                            <span>Shift Active</span>
                        </div>
                        <span className="shift-time">
                            Since {new Date(currentShift.opened_at).toLocaleTimeString()}
                        </span>
                    </div>
                    <div className="shift-stats-row">
                        <div className="shift-stat">
                            <DollarSign size={18} />
                            <div>
                                <span className="stat-label">Opening</span>
                                <span className="stat-value">{formatCurrency(currentShift.opening_balance)}</span>
                            </div>
                        </div>
                        <div className="shift-stat">
                            <TrendingUp size={18} />
                            <div>
                                <span className="stat-label">Cash Sales</span>
                                <span className="stat-value">{formatCurrency(currentShift.cash_total)}</span>
                            </div>
                        </div>
                        <div className="shift-stat">
                            <TrendingUp size={18} />
                            <div>
                                <span className="stat-label">Card Sales</span>
                                <span className="stat-value">{formatCurrency(currentShift.card_total)}</span>
                            </div>
                        </div>
                        <div className="shift-stat">
                            <TrendingUp size={18} />
                            <div>
                                <span className="stat-label">Orders</span>
                                <span className="stat-value">{currentShift.order_count}</span>
                            </div>
                        </div>
                    </div>

                    {!showCloseForm ? (
                        <button className="shift-close-btn" onClick={() => setShowCloseForm(true)}>
                            <Square size={16} /> Close Shift
                        </button>
                    ) : (
                        <div className="shift-close-form">
                            <h4>Cash Tally</h4>
                            <p className="expected-cash">
                                Expected Cash in Drawer: <strong>{formatCurrency(
                                    parseFloat(currentShift.opening_balance || 0) + parseFloat(currentShift.cash_total || 0)
                                )}</strong>
                            </p>
                            <div className="shift-input-group">
                                <label>Actual Cash Count:</label>
                                <input
                                    type="number"
                                    value={actualCash}
                                    onChange={(e) => setActualCash(e.target.value)}
                                    placeholder="Enter actual cash in drawer"
                                />
                            </div>
                            <div className="shift-input-group">
                                <label>Note (optional):</label>
                                <input
                                    type="text"
                                    value={closeNote}
                                    onChange={(e) => setCloseNote(e.target.value)}
                                    placeholder="Any notes about the cash difference..."
                                />
                            </div>
                            <div className="shift-close-actions">
                                <button className="shift-btn-confirm" onClick={handleCloseShift} disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    Confirm Close
                                </button>
                                <button className="shift-btn-cancel" onClick={() => setShowCloseForm(false)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="shift-open-card">
                    <h3><Play size={20} /> Open a New Shift</h3>
                    <p>Count the cash in your drawer and enter the opening balance.</p>
                    <div className="shift-input-group">
                        <label>Opening Balance (PKR):</label>
                        <input
                            type="number"
                            value={openingBalance}
                            onChange={(e) => setOpeningBalance(e.target.value)}
                            placeholder="e.g. 5000"
                        />
                    </div>
                    <button className="shift-open-btn" onClick={handleOpenShift} disabled={submitting || !openingBalance}>
                        {submitting ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                        Start Shift
                    </button>
                </div>
            )}

            {/* Shift History */}
            <div className="shift-history">
                <h3><Calendar size={20} /> Shift History</h3>
                {shifts.length === 0 ? (
                    <p className="empty-msg">No shift records yet.</p>
                ) : (
                    <div className="shift-list">
                        {shifts.map((shift) => (
                            <div key={shift.id} className={`shift-history-card ${shift.status}`}>
                                <div
                                    className="shift-history-header"
                                    onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}
                                >
                                    <div className="shift-history-info">
                                        <User size={16} />
                                        <span className="shift-user">{shift.user?.name || 'Unknown'}</span>
                                        <span className={`shift-status-badge ${shift.status}`}>
                                            {shift.status}
                                        </span>
                                    </div>
                                    <div className="shift-history-meta">
                                        <span>{new Date(shift.opened_at).toLocaleDateString()}</span>
                                        <span>{formatCurrency(shift.total_revenue)}</span>
                                        {expandedShift === shift.id ?
                                            <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </div>

                                {expandedShift === shift.id && (
                                    <div className="shift-history-details">
                                        <div className="shift-detail-row">
                                            <span>Opening Balance</span>
                                            <span>{formatCurrency(shift.opening_balance)}</span>
                                        </div>
                                        <div className="shift-detail-row">
                                            <span>Cash Sales</span>
                                            <span>{formatCurrency(shift.cash_total)}</span>
                                        </div>
                                        <div className="shift-detail-row">
                                            <span>Card/Digital Sales</span>
                                            <span>{formatCurrency(shift.card_total)}</span>
                                        </div>
                                        <div className="shift-detail-row">
                                            <span>Total Orders</span>
                                            <span>{shift.order_count}</span>
                                        </div>
                                        {shift.status === 'closed' && (
                                            <>
                                                <div className="shift-detail-row highlight">
                                                    <span>Expected Cash</span>
                                                    <span>{formatCurrency(shift.closing_balance)}</span>
                                                </div>
                                                <div className="shift-detail-row highlight">
                                                    <span>Actual Cash</span>
                                                    <span>{formatCurrency(shift.actual_cash)}</span>
                                                </div>
                                                <div className={`shift-detail-row difference ${parseFloat(shift.difference) < 0 ? 'negative' : 'positive'}`}>
                                                    <span>Difference</span>
                                                    <span>{formatCurrency(shift.difference)}</span>
                                                </div>
                                                {shift.note && (
                                                    <div className="shift-note">
                                                        <AlertTriangle size={14} /> {shift.note}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <div className="shift-detail-row">
                                            <span>Opened</span>
                                            <span>{new Date(shift.opened_at).toLocaleString()}</span>
                                        </div>
                                        {shift.closed_at && (
                                            <div className="shift-detail-row">
                                                <span>Closed</span>
                                                <span>{new Date(shift.closed_at).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
