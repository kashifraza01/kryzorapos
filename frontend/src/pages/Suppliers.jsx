import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Loader2, Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import api from '../api';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/suppliers', formData);
            setShowModal(false);
            setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
            fetchSuppliers();
        } catch (error) {
            alert('Error saving supplier');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteSupplier = async (id) => {
        if (!window.confirm('Remove this supplier?')) return;
        try {
            await api.delete(`/suppliers/${id}`);
            fetchSuppliers();
        } catch (error) {
            alert('Could not delete');
        }
    };

    if (loading) return <div className="loading">Loading Suppliers...</div>;

    return (
        <div className="suppliers-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Supplier Management</h2>
                    <p className="text-muted">Manage vendors for meat, vegetables, and supplies</p>
                </div>
                <button className="add-btn" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Add Supplier</span>
                </button>
            </div>

            <div className="suppliers-grid mt-6">
                {suppliers.length === 0 ? (
                    <div className="no-data-card" style={{ gridColumn: '1/-1' }}>No suppliers added yet.</div>
                ) : (
                    suppliers.map(s => (
                        <div key={s.id} className="supplier-card">
                            <div className="card-header-flex">
                                <h3>{s.name}</h3>
                                <button className="icon-btn-ghost delete" onClick={() => deleteSupplier(s.id)}><Trash2 size={16} /></button>
                            </div>
                            <p className="contact-person"><span className="label">Contact:</span> {s.contact_person || 'N/A'}</p>
                            <div className="contact-info-list">
                                <div className="info-item"><Phone size={14} /> <span>{s.phone}</span></div>
                                <div className="info-item"><Mail size={14} /> <span>{s.email || 'No email'}</span></div>
                                <div className="info-item"><MapPin size={14} /> <span>{s.address || 'No address'}</span></div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Supplier</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Supplier / Company Name</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Contact Person</label>
                                <input type="text" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group"><label>Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
                                <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                            </div>
                            <div className="form-group"><label>Address</label><textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Save Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
