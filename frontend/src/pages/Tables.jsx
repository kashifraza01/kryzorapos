import React, { useState, useEffect } from 'react';
import { Table2, Users, Plus, X, Loader2, Move } from 'lucide-react';
import api from '../api';

export default function Tables() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', capacity: 4 });

    const fetchTables = async () => {
        try {
            const res = await api.get('/tables');
            setTables(res.data);
        } catch (error) {
            console.error('Error fetching tables:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePosition = async (id, x, y) => {
        try {
            await api.put(`/tables/${id}/position`, { x_pos: x, y_pos: y });
            setTables(prev => prev.map(t => t.id === id ? { ...t, x_pos: x, y_pos: y } : t));
        } catch (error) {
            console.error('Error updating table position:', error);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const handleAddTable = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/tables', formData);
            setShowModal(false);
            setFormData({ name: '', capacity: 4 });
            fetchTables();
        } catch (error) {
            alert('Error adding table');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDragStart = (e, tableId) => {
        if (!isEditMode) return;
        e.dataTransfer.setData('tableId', tableId);
    };

    const handleDrop = (e) => {
        if (!isEditMode) return;
        e.preventDefault();
        const tableId = e.dataTransfer.getData('tableId');
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left - 50); // 50 is half table width approximation
        const y = Math.round(e.clientY - rect.top - 50);
        handleUpdatePosition(tableId, x, y);
    };

    const handleDragOver = (e) => {
        if (!isEditMode) return;
        e.preventDefault();
    };

    if (loading) {
        return <div className="loading">Loading table layout...</div>;
    }

    return (
        <div className="tables-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Table Layout</h2>
                    <p className="text-muted">{isEditMode ? 'Drag tables to arrange your floor plan' : 'Monitor and manage restaurant tables'}</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button
                        className={`add-btn-secondary ${isEditMode ? 'active' : ''}`}
                        onClick={() => setIsEditMode(!isEditMode)}
                    >
                        <Move size={18} />
                        <span>{isEditMode ? 'Finish Arrangement' : 'Edit Layout'}</span>
                    </button>
                    <div className="table-legend">
                        <div className="legend-item"><span className="dot available"></span> Available</div>
                        <div className="legend-item"><span className="dot occupied"></span> Occupied</div>
                        <div className="legend-item"><span className="dot reserved"></span> Reserved</div>
                    </div>
                    <button className="add-btn flex items-center gap-2" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        <span>Add Table</span>
                    </button>
                </div>
            </div>

            <div
                className={`tables-floor-plan ${isEditMode ? 'edit-mode' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {tables.map(table => (
                    <div
                        key={table.id}
                        className={`table-card-v2 ${table.status} ${isEditMode ? 'draggable' : ''}`}
                        draggable={isEditMode}
                        onDragStart={(e) => handleDragStart(e, table.id)}
                        style={{
                            position: 'absolute',
                            left: `${table.x_pos}px`,
                            top: `${table.y_pos}px`
                        }}
                    >
                        <div className="table-v2-header">
                            <span className="table-v2-num">{table.table_number}</span>
                            <span className="table-v2-cap"><Users size={12} />{table.capacity}</span>
                        </div>
                        <div className="table-v2-body">
                            <Table2 size={32} />
                        </div>
                        {!isEditMode && (
                            <div className="table-v2-footer">
                                <button className="table-v2-btn">
                                    {table.status === 'available' ? 'Serve' : 'View'}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Table Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Restaurant Table</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddTable} className="modal-form">
                            <div className="form-group">
                                <label>Table Name / Number</label>
                                <input
                                    type="text" required
                                    placeholder="e.g. Table 15"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Capacity (Persons)</label>
                                <input
                                    type="number" required
                                    value={formData.capacity}
                                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Create Table'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
