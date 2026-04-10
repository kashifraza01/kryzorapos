import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, History, Loader2, Calendar } from 'lucide-react';
import api from '../api';

export default function Attendance() {
    const [status, setStatus] = useState({ is_clocked_in: false, attendance: null });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statusRes, historyRes] = await Promise.all([
                api.get('/attendance/status'),
                api.get('/attendance/history')
            ]);
            setStatus(statusRes.data);
            setHistory(historyRes.data);
        } catch (err) {
            console.error('Failed to fetch attendance data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClockToggle = async () => {
        setActionLoading(true);
        try {
            const endpoint = status.is_clocked_in ? '/attendance/clock-out' : '/attendance/clock-in';
            await api.post(endpoint);
            await fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="loading"><Loader2 className="animate-spin" /> Loading Attendance...</div>;

    return (
        <div className="attendance-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Staff Attendance</h2>
                    <p className="text-muted">Clock in/out and view your work history</p>
                </div>
            </div>

            <div className="stats-grid mb-6">
                <div className={`report-card ${status.is_clocked_in ? 'active-work' : ''}`} style={{ borderLeft: `4px solid ${status.is_clocked_in ? 'var(--success)' : 'var(--error)'}` }}>
                    <div className="card-header-flex">
                        <div>
                            <span className="card-label">Current Status</span>
                            <h3 className="card-value">{status.is_clocked_in ? 'Clocked In' : 'Clocked Out'}</h3>
                        </div>
                        <div className={`card-icon-bg ${status.is_clocked_in ? 'revenue' : 'orders'}`}>
                            {status.is_clocked_in ? <UserCheck /> : <UserX />}
                        </div>
                    </div>
                    <button 
                        className="checkout-btn w-full mt-4" 
                        onClick={handleClockToggle} 
                        disabled={actionLoading}
                        style={{ background: status.is_clocked_in ? 'var(--error)' : 'var(--success)' }}
                    >
                        {actionLoading ? 'Processing...' : (status.is_clocked_in ? 'Clock Out' : 'Clock In Now')}
                    </button>
                </div>

                <div className="report-card">
                    <div className="card-header-flex">
                        <div>
                            <span className="card-label">Last Clock In</span>
                            <h3 className="card-value">
                                {status.attendance ? new Date(status.attendance.clock_in).toLocaleTimeString() : '--:--'}
                            </h3>
                        </div>
                        <div className="card-icon-bg profit"><Clock /></div>
                    </div>
                    <p className="text-muted mt-2">Active session started</p>
                </div>
            </div>

            <div className="inventory-table-container">
                <div className="chart-header flex justify-between items-center p-4 border-b">
                    <h4 className="flex items-center gap-2"><History size={18} /> My Attendance History</h4>
                </div>
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Clock In</th>
                            <th>Clock Out</th>
                            <th>Hours</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((record, idx) => (
                            <tr key={idx}>
                                <td>{new Date(record.clock_in).toLocaleDateString()}</td>
                                <td>{new Date(record.clock_in).toLocaleTimeString()}</td>
                                <td>{record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : 'Active'}</td>
                                <td>{record.total_hours?.toFixed(1) || '0'} hrs</td>
                                <td>
                                    <span className={`status-badge ${record.status === 'present' ? 'ok' : 'pending'}`}>
                                        {record.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
