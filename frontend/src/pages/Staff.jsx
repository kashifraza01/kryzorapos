import React, { useState, useEffect } from 'react';
import { Users, Shield, UserPlus, MoreVertical, Smartphone, Mail, Trash2, X, Loader2 } from 'lucide-react';
import api from '../api';

export default function Staff() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role_id: '3', // Default to Cashier
        phone: ''
    });

    const fetchStaff = async () => {
        try {
            const res = await api.get('/staff');
            setStaff(res.data);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const openEditModal = (member) => {
        setEditingStaff(member);
        setFormData({
            name: member.name,
            email: member.email || '',
            password: '',
            role_id: member.role_id || '3',
            phone: member.phone || ''
        });
        setShowModal(true);
    };

    const handleSubmitStaff = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingStaff) {
                const updateData = { ...formData };
                if (!updateData.password) delete updateData.password;

                await api.put(`/staff/${editingStaff.id}`, updateData);
            } else {
                await api.post('/staff', formData);
            }
            setShowModal(false);
            setEditingStaff(null);
            setFormData({ name: '', email: '', password: '', role_id: '3', phone: '' });
            fetchStaff();
        } catch (error) {
            alert('Error saving staff: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const deleteStaff = async (id) => {
        if (!window.confirm('Are you sure you want to remove this staff member?')) return;
        try {
            await api.delete(`/staff/${id}`);
            fetchStaff();
        } catch (error) {
            alert('Could not delete staff member.');
        }
    };

    if (loading) {
        return <div className="loading">Loading staff directory...</div>;
    }

    return (
        <div className="staff-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Staff Management</h2>
                    <p className="text-muted">Manage your team and their permissions</p>
                </div>
                <button className="add-btn flex items-center gap-2" onClick={() => { setEditingStaff(null); setFormData({ name: '', email: '', password: '', role_id: '3', phone: '' }); setShowModal(true); }}>
                    <UserPlus size={18} />
                    <span>Add Staff</span>
                </button>
            </div>

            <div className="staff-grid">
                {staff.map(member => (
                    <div key={member.id} className="staff-card">
                        <div className="staff-card-header">
                            <div className="staff-avatar">{member.name.split(' ').map(n => n[0]).join('')}</div>
                            <div className="card-actions">
                                <button className="icon-btn-ghost" onClick={() => deleteStaff(member.id)}>
                                    <Trash2 size={16} color="var(--error)" />
                                </button>
                                <button className="icon-btn-ghost"><MoreVertical size={18} /></button>
                            </div>
                        </div>

                        <div className="staff-card-body">
                            <h4 className="staff-name">{member.name}</h4>
                            <div className="staff-role-badge">
                                <Shield size={14} />
                                <span>{member.role?.name || 'Staff'}</span>
                            </div>
                            <div className="staff-contact">
                                <div className="contact-item">
                                    <Mail size={14} />
                                    <span>{member.email}</span>
                                </div>
                                {member.phone && (
                                    <div className="contact-item">
                                        <Smartphone size={14} />
                                        <span>{member.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="staff-card-footer">
                            <div className={`status-dot active`}></div>
                            <span className="status-label">Active</span>
                            <button className="edit-staff-btn" onClick={() => openEditModal(member)}>Edit Staff</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Staff Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitStaff} className="modal-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text" required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone Number <span style={{ color: 'var(--error)' }}>*</span></label>
                                <input
                                    type="text" required
                                    placeholder="e.g. 03XXXXXXXXX"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Address (Optional)</label>
                                <input
                                    type="email"
                                    placeholder="Optional"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Password {!editingStaff && <span style={{ color: 'var(--error)' }}>*</span>}</label>
                                <input
                                    type="password" required={!editingStaff}
                                    placeholder={editingStaff ? "Leave blank to keep current" : ""}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Role <span style={{ color: 'var(--error)' }}>*</span></label>
                                <select
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                >
                                    <option value="1">Admin</option>
                                    <option value="2">Manager</option>
                                    <option value="3">Cashier</option>
                                    <option value="4">Waiter</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : (editingStaff ? 'Save Changes' : 'Create Staff')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
