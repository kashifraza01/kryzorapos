import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, X, Loader2, Calendar, Package, Trash2, ArrowRight } from 'lucide-react';
import api from '../api';

export default function Purchases() {
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New Purchase form
    const [formData, setFormData] = useState({
        supplier_id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        payment_status: 'paid',
        items: [{ inventory_id: '', quantity: '', cost_price: '' }]
    });

    const fetchData = async () => {
        try {
            const [purRes, supRes, invRes] = await Promise.all([
                api.get('/purchases'),
                api.get('/suppliers'),
                api.get('/inventory')
            ]);
            setPurchases(purRes.data);
            setSuppliers(supRes.data);
            setInventory(invRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addItem = () => {
        setFormData({ ...formData, items: [...formData.items, { inventory_id: '', quantity: '', cost_price: '' }] });
    };

    const removeItem = (index) => {
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const updateItem = (index, field, value) => {
        const newItems = formData.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.some(i => !i.inventory_id || !i.quantity || !i.cost_price)) {
            alert('Please fill all item details');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/purchases', formData);
            setShowModal(false);
            setFormData({
                supplier_id: '',
                purchase_date: new Date().toISOString().split('T')[0],
                payment_status: 'paid',
                items: [{ inventory_id: '', quantity: '', cost_price: '' }]
            });
            fetchData();
        } catch (error) {
            alert('Error recording purchase: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading">Loading Purchases...</div>;

    return (
        <div className="purchases-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Inventory Procurement</h2>
                    <p className="text-muted">Record stock purchases and track costs from suppliers</p>
                </div>
                <button className="add-btn" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Record New Purchase</span>
                </button>
            </div>

            <div className="inventory-table-container mt-6">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Supplier</th>
                            <th>Items</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.map(p => (
                            <tr key={p.id}>
                                <td>#{p.id}</td>
                                <td>{new Date(p.purchase_date).toLocaleDateString()}</td>
                                <td><strong>{p.supplier?.name}</strong></td>
                                <td>
                                    <div className="purchase-items-summary">
                                        {p.items.map(i => (
                                            <span key={i.id} className="item-token">{i.inventory?.item_name} ({i.quantity})</span>
                                        ))}
                                    </div>
                                </td>
                                <td><strong>Rs. {Number(p.total_amount).toLocaleString()}</strong></td>
                                <td><span className={`status-badge ${p.payment_status}`}>{p.payment_status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content large-modal">
                        <div className="modal-header">
                            <h3>Purchase Stock (Stock IN)</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="grid-3 gap-4">
                                <div className="form-group">
                                    <label>Select Supplier</label>
                                    <select required value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}>
                                        <option value="">Choose...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Purchase Date</label>
                                    <input type="date" required value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Payment Status</label>
                                    <select value={formData.payment_status} onChange={(e) => setFormData({...formData, payment_status: e.target.value})}>
                                        <option value="paid">Fully Paid</option>
                                        <option value="partial">Partial</option>
                                        <option value="unpaid">Unpaid (Credit)</option>
                                    </select>
                                </div>
                            </div>

                            <hr className="my-4" />
                            <h4>Items Purchased</h4>
                            <div className="purchase-items-editor">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="purchase-item-row grid-4-cols gap-2 mb-2">
                                        <div className="form-group">
                                            <select required value={item.inventory_id} onChange={(e) => updateItem(index, 'inventory_id', e.target.value)}>
                                                <option value="">Select Stock Item...</option>
                                                {inventory.map(i => <option key={i.id} value={i.id}>{i.item_name} ({i.unit})</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <input type="number" required step="any" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <input type="number" required placeholder="Cost per Unit" value={item.cost_price} onChange={(e) => updateItem(index, 'cost_price', e.target.value)} />
                                        </div>
                                        <div className="flex gap-1 items-center">
                                            <button type="button" className="icon-btn-ghost delete" onClick={() => removeItem(index)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className="add-btn mt-2" onClick={addItem}>
                                    <Plus size={16} className="mr-1" /> Add Another Item
                                </button>
                            </div>

                            <div className="modal-actions mt-6">
                                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Record & Update Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
