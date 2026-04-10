import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Plus, X, Loader2, Search, Edit, Trash2 } from 'lucide-react';
import api from '../api';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 2) {
            try {
                const res = await api.get(`/customers/search?q=${query}`);
                setCustomers(res.data);
            } catch (error) {
                console.error('Search failed:', error);
            }
        } else if (query.length === 0) {
            fetchCustomers();
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
        setShowModal(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.address || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            setShowModal(false);
            fetchCustomers();
        } catch (error) {
            alert(error.response?.data?.message || 'Error saving customer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;
        try {
            await api.delete(`/customers/${id}`);
            fetchCustomers();
        } catch (error) {
            alert('Error deleting customer');
        }
    };

    return (
        <div className="customers-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Customer Database</h2>
                    <p className="text-muted">Manage loyalty and customer records</p>
                </div>
                <button className="add-btn flex items-center gap-2" onClick={openAddModal}>
                    <Plus size={18} />
                    <span>Add Customer</span>
                </button>
            </div>

            <div className="inventory-controls mb-6">
                <div className="inventory-search">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Loyalty Points</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center p-8">Loading customers...</td></tr>
                        ) : customers.length === 0 ? (
                            <tr><td colSpan="5" className="text-center p-8">No customers found.</td></tr>
                        ) : (
                            customers.map(customer => (
                                <tr key={customer.id}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="user-avatar-sm">{customer.name[0]}</div>
                                            <span className="font-semibold">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td>{customer.phone}</td>
                                    <td>{customer.email || '-'}</td>
                                    <td>
                                        <span className="points-badge">{customer.loyalty_points} pts</span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="icon-btn-ghost" onClick={() => openEditModal(customer)}><Edit size={16} /></button>
                                            <button className="icon-btn-ghost delete" onClick={() => handleDelete(customer.id)}><Trash2 size={16} color="var(--error)" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text" required
                                    placeholder="Enter name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="text" required
                                    placeholder="e.g. 03001234567"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email (Optional)</label>
                                <input
                                    type="email"
                                    placeholder="customer@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea
                                    placeholder="Delivery address..."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Save Customer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
