import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Search, Plus, X, Loader2, Trash2 } from 'lucide-react';
import api from '../api';

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // For Stock Adjustment
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [adjustData, setAdjustData] = useState({
        change: '',
        type: 'restock',
        reason: ''
    });

    const [formData, setFormData] = useState({
        item_name: '',
        quantity: '',
        unit: 'kg',
        low_stock_threshold: ''
    });

    const fetchInventory = async () => {
        try {
            const res = await api.get('/inventory');
            setItems(res.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleAddItem = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/inventory', formData);
            setShowModal(false);
            setFormData({ item_name: '', quantity: '', unit: 'kg', low_stock_threshold: '' });
            fetchInventory();
        } catch (error) {
            alert('Error adding item: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post(`/inventory/${selectedItem.id}/stock`, adjustData);
            setShowAdjustModal(false);
            setAdjustData({ change: '', type: 'restock', reason: '' });
            fetchInventory();
        } catch (error) {
            alert('Error adjusting stock: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to remove this item?')) return;
        try {
            await api.delete(`/inventory/${id}`);
            fetchInventory();
        } catch (error) {
            alert('Could not delete item.');
        }
    };

    const filteredItems = items.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="loading">Loading inventory data...</div>;
    }

    const lowStockCount = items.filter(i => Number(i.quantity) < Number(i.low_stock_threshold)).length;

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Inventory Management</h2>
                    <p className="text-muted">Track your stock levels and usage</p>
                </div>
                <button className="add-btn flex items-center gap-2" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Add New Item</span>
                </button>
            </div>

            <div className="inventory-stats">
                <div className="stat-card">
                    <div className="stat-info">
                        <span className="stat-label">Total Items</span>
                        <span className="stat-value">{items.length}</span>
                    </div>
                    <Package className="stat-icon" size={32} />
                </div>
                <div className="stat-card warning">
                    <div className="stat-info">
                        <span className="stat-label">Low Stock Alerts</span>
                        <span className="stat-value">{lowStockCount}</span>
                    </div>
                    <AlertTriangle className="stat-icon" size={32} />
                </div>
            </div>

            <div className="inventory-controls">
                <div className="search-bar inventory-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search inventory..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Current Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <span className="item-name-cell">{item.item_name}</span>
                                </td>
                                <td>
                                    <div className="stock-info">
                                        <span className="stock-qty">{item.quantity} {item.unit}</span>
                                        <span className="stock-min">Min: {item.low_stock_threshold}</span>
                                    </div>
                                </td>
                                <td>
                                    {Number(item.quantity) < Number(item.low_stock_threshold) ? (
                                        <span className="status-badge low">Low Stock</span>
                                    ) : (
                                        <span className="status-badge ok">Healthy</span>
                                    )}
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="icon-btn-sm" title="Adjust Stock" onClick={() => {
                                            setSelectedItem(item);
                                            setShowAdjustModal(true);
                                        }}>
                                            <ArrowUpRight size={16} />
                                        </button>
                                        <button className="icon-btn-sm delete" title="Delete" onClick={() => deleteItem(item.id)}>
                                            <Trash2 size={16} color="var(--error)" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Item Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add Item to Inventory</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddItem} className="modal-form">
                            <div className="form-group">
                                <label>Item Name</label>
                                <input
                                    type="text" required
                                    placeholder="e.g. Basmati Rice"
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Initial Quantity</label>
                                    <input
                                        type="number" required
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        <option value="kg">kilograms (kg)</option>
                                        <option value="ltr">liters (ltr)</option>
                                        <option value="pcs">pieces (pcs)</option>
                                        <option value="box">boxes</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Low Stock Alert Threshold (Min)</label>
                                <input
                                    type="number" required
                                    value={formData.low_stock_threshold}
                                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Add to Inventory'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjust Stock Modal */}
            {showAdjustModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Adjust Stock: {selectedItem?.item_name}</h3>
                            <button onClick={() => setShowAdjustModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAdjustStock} className="modal-form">
                            <div className="form-group">
                                <label>Quantity to Add/Subtract</label>
                                <input
                                    type="number" required
                                    placeholder="e.g. 10.5"
                                    value={adjustData.change}
                                    onChange={(e) => setAdjustData({ ...adjustData, change: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Action Type</label>
                                <select
                                    value={adjustData.type}
                                    onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                                >
                                    <option value="restock">Restock (+)</option>
                                    <option value="usage">Usage (-)</option>
                                    <option value="wastage">Wastage (-)</option>
                                    <option value="correction">Correction (+/-)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Reason (Optional)</label>
                                <textarea
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Confirm Adjustment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
