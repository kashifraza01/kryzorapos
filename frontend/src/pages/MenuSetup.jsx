import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Edit, Trash2, Tag, Utensils, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import api from '../api';

export default function MenuSetup() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    const [showCatModal, setShowCatModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);

    const [catFormData, setCatFormData] = useState({ name: '', image: '', image_file: null });
    const [itemFormData, setItemFormData] = useState({
        category_id: '',
        name: '',
        price: '',
        cost_price: '',
        description: '',
        image: '',
        image_file: null,
        stock_type: 'fixed'
    });

    const [showEditItemModal, setShowEditItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const openEditModal = (item) => {
        setEditingItem(item);
        setItemFormData({
            category_id: item.category_id,
            name: item.name,
            price: item.price,
            cost_price: item.cost_price || '',
            description: item.description || '',
            image: item.image || '',
            image_file: null,
            stock_type: item.stock_type || 'fixed'
        });
        setShowEditItemModal(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData();
        Object.keys(itemFormData).forEach(key => {
            if (key !== 'image_file' && itemFormData[key] !== null) {
                formData.append(key, itemFormData[key]);
            }
        });
        if (itemFormData.image_file) {
            formData.append('image_file', itemFormData.image_file);
        }
        // Laravel spoofing for PUT since we're using Multipart
        formData.append('_method', 'PUT');

        try {
            await api.post(`/menu/items/${editingItem.id}`, formData);
            setShowEditItemModal(false);
            setEditingItem(null);
            setItemFormData({ ...itemFormData, name: '', price: '', cost_price: '', description: '', image: '', image_file: null });
            fetchMenu();
            showToast('Item updated successfully', 'success');
        } catch (error) {
            showToast(error.response?.data?.message || 'Error updating item', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const [inventory, setInventory] = useState([]);
    const [showIngModal, setShowIngModal] = useState(false);
    const [itemIngredients, setItemIngredients] = useState([]);

    const openIngModal = async (item) => {
        setEditingItem(item);
        setLoading(true);
        try {
            const [ingRes, invRes] = await Promise.all([
                api.get(`/menu/items/${item.id}/ingredients`),
                api.get('/inventory')
            ]);
            setItemIngredients(ingRes.data);
            setInventory(invRes.data);
            setShowIngModal(true);
        } catch (error) {
            showToast('Error fetching ingredients', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateIngredients = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post(`/menu/items/${editingItem.id}/ingredients`, { ingredients: itemIngredients });
            setShowIngModal(false);
            showToast('Recipe updated successfully');
        } catch (error) {
            alert('Error updating ingredients');
        } finally {
            setSubmitting(false);
        }
    };

    const addIngredientRow = () => {
        setItemIngredients([...itemIngredients, { inventory_id: '', quantity_required: 0.1 }]);
    };

    const removeIngredientRow = (idx) => {
        setItemIngredients(itemIngredients.filter((_, i) => i !== idx));
    };

    const updateIngredientRow = (idx, field, val) => {
        const newIngs = [...itemIngredients];
        newIngs[idx][field] = val;
        setItemIngredients(newIngs);
    };

    const fetchMenu = async () => {
        try {
            const res = await api.get('/menu/all');
            setCategories(res.data);
            if (res.data.length > 0 && !itemFormData.category_id) {
                setItemFormData(prev => ({ ...prev, category_id: res.data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching menu:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    const handleAddCategory = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData();
        formData.append('name', catFormData.name);
        if (catFormData.image_file) {
            formData.append('image_file', catFormData.image_file);
        }
        try {
            await api.post('/menu/categories', formData);
            setShowCatModal(false);
            setCatFormData({ name: '', image: '', image_file: null });
            fetchMenu();
            showToast('Category added successfully', 'success');
        } catch (error) {
            console.error('Add category error:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || 'Error adding category';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData();
        Object.keys(itemFormData).forEach(key => {
            if (key !== 'image_file' && itemFormData[key] !== null) {
                formData.append(key, itemFormData[key]);
            }
        });
        if (itemFormData.image_file) {
            formData.append('image_file', itemFormData.image_file);
        }

        try {
            await api.post('/menu/items', formData);
            setShowItemModal(false);
            setItemFormData({ ...itemFormData, name: '', price: '', cost_price: '', description: '', image: '', image_file: null });
            fetchMenu();
            showToast('Item added successfully', 'success');
        } catch (error) {
            console.error('Add item error:', error);
            const msg = error.response?.data?.message || error.response?.data?.error || 'Error adding item';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleAvailability = async (item) => {
        try {
            await api.put(`/menu/items/${item.id}`, { is_available: !item.is_available });
            fetchMenu();
        } catch (error) {
            showToast('Error updating availability', 'error');
        }
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await api.delete(`/menu/items/${id}`);
            fetchMenu();
            showToast('Item deleted', 'success');
        } catch (error) {
            showToast('Error deleting item', 'error');
        }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category? All items in it will also be deleted.')) return;
        try {
            await api.delete(`/menu/categories/${id}`);
            fetchMenu();
            showToast('Category deleted', 'success');
        } catch (error) {
            showToast('Error deleting category', 'error');
        }
    };

    if (loading) return <div className="loading">Processing...</div>;

    return (
        <div className="menu-setup-page">
            {toast.show && (
                <div className={`pos-toast ${toast.type}`} style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999 }}>
                    {toast.message}
                </div>
            )}
            <div className="page-header">
                <div className="header-title">
                    <h2>Menu Management</h2>
                    <p className="text-muted">Set up your restaurant's digital menu</p>
                </div>
                <div className="header-actions-flex">
                    <button className="add-btn-secondary" onClick={() => { console.log('Opening category modal'); setShowCatModal(true); }}>
                        <Tag size={18} />
                        <span>Add Category</span>
                    </button>
                    <button className="add-btn" onClick={() => { console.log('Opening item modal'); setShowItemModal(true); }}>
                        <Utensils size={18} />
                        <span>Add Menu Item</span>
                    </button>
                </div>
            </div>

            {categories.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                    <Utensils size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>No Menu Categories</h3>
                    <p>Get started by adding your first menu category.</p>
                </div>
            ) : (
                <div className="menu-setup-grid">
                    {categories.map(cat => (
                    <div key={cat.id} className="setup-cat-section">
                        <div className="section-header">
                            <h3>{cat.name}</h3>
                            <div className="flex gap-1">
                                <button
                                    className="icon-btn-ghost"
                                    onClick={() => deleteCategory(cat.id)}
                                    title="Delete Category"
                                >
                                    <Trash2 size={16} color="var(--error)" />
                                </button>
                            </div>
                        </div>
                        <div className="setup-items-list">
                            {cat.items?.map(item => (
                                <div key={item.id} className={`setup-item-card ${!item.is_available ? 'disabled' : ''}`}>
                                    {item.image && (
                                        <div className="item-preview-img">
                                            <img src={`/storage/${item.image}`} alt={item.name} />
                                        </div>
                                    )}
                                    <div className="item-info">
                                        <div className="flex justify-between items-start">
                                            <span className="item-name font-bold">{item.name}</span>
                                            <span className="item-price text-sm">Rs. {Number(item.price).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="item-actions-flex p-2 flex justify-between border-t mt-auto">
                                        <button className="action-tag recipe" onClick={() => openIngModal(item)} title="Manage Ingredients">
                                            <Package size={14} /> Recipe
                                        </button>
                                        <div className="flex gap-1">
                                            <button className="icon-btn-ghost" onClick={() => openEditModal(item)}><Edit size={14} color="var(--primary)" /></button>
                                            <button className="icon-btn-ghost" onClick={() => toggleAvailability(item)}>
                                                {item.is_available ? <ToggleRight size={18} color="var(--success)" /> : <ToggleLeft size={18} color="var(--text-muted)" />}
                                            </button>
                                            <button className="icon-btn-ghost" onClick={() => deleteItem(item.id)}><Trash2 size={14} color="var(--error)" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                </div>
            )}

            {/* Ingredients Modal */}
            {showIngModal && (
                <div className="modal-overlay">
                    <div className="modal-content medium-modal">
                        <div className="modal-header">
                            <h3>Manage Recipe: {editingItem?.name}</h3>
                            <button onClick={() => setShowIngModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateIngredients} className="modal-form">
                            <p className="text-xs text-muted mb-4 uppercase font-bold tracking-wider">Define ingredients to deduct from stock when sold</p>
                            <div className="ingredients-list max-h-60 overflow-y-auto pr-2">
                                {itemIngredients.map((ing, idx) => (
                                    <div key={idx} className="ingredient-row-flex mb-2 flex gap-2 items-center">
                                        <select 
                                            className="flex-1"
                                            value={ing.inventory_id} 
                                            required
                                            onChange={(e) => updateIngredientRow(idx, 'inventory_id', e.target.value)}
                                        >
                                            <option value="">Select Stock Item...</option>
                                            {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.item_name} ({inv.unit})</option>)}
                                        </select>
                                        <input 
                                            type="number" step="any" required
                                            placeholder="Qty"
                                            className="w-24"
                                            value={ing.quantity_required} 
                                            onChange={(e) => updateIngredientRow(idx, 'quantity_required', e.target.value)}
                                        />
                                        <button type="button" className="icon-btn-ghost" onClick={() => removeIngredientRow(idx)}><Trash2 size={16} color="var(--error)" /></button>
                                    </div>
                                ))}
                                <button type="button" className="add-btn-secondary text-xs py-1 mt-2" onClick={addIngredientRow}>
                                    <Plus size={14} /> Add Ingredient
                                </button>
                            </div>
                            <div className="modal-actions mt-6">
                                <button type="button" className="cancel-btn" onClick={() => setShowIngModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Recipe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modals same as before */}
            {showCatModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Menu Category</h3>
                            <button onClick={() => setShowCatModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddCategory} className="modal-form">
                            <div className="form-group">
                                <label>Category Name</label>
                                <input
                                    type="text" required
                                    placeholder="e.g. Desserts"
                                    value={catFormData.name}
                                    onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Category Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCatFormData({ ...catFormData, image_file: e.target.files[0] })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowCatModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showItemModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Menu Item</h3>
                            <button onClick={() => setShowItemModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddItem} className="modal-form">
                            <div className="form-group">
                                <label>Target Category</label>
                                <select
                                    value={itemFormData.category_id}
                                    onChange={(e) => setItemFormData({ ...itemFormData, category_id: e.target.value })}
                                >
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Item Name</label>
                                <input
                                    type="text" required
                                    placeholder="e.g. Biryani"
                                    value={itemFormData.name}
                                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Selling Price (Rs.)</label>
                                    <input
                                        type="number" required
                                        value={itemFormData.price}
                                        onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cost Price (Rs.)</label>
                                    <input
                                        type="number" required
                                        value={itemFormData.cost_price}
                                        onChange={(e) => setItemFormData({ ...itemFormData, cost_price: e.target.value })}
                                        placeholder="Min. cost"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Item Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setItemFormData({ ...itemFormData, image_file: e.target.files[0] })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowItemModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditItemModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Menu Item</h3>
                            <button onClick={() => setShowEditItemModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdateItem} className="modal-form">
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={itemFormData.category_id}
                                    onChange={(e) => setItemFormData({ ...itemFormData, category_id: e.target.value })}
                                >
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Item Name</label>
                                <input
                                    type="text" required
                                    value={itemFormData.name}
                                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Selling Price (Rs.)</label>
                                    <input
                                        type="number" required
                                        value={itemFormData.price}
                                        onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cost Price (Rs.)</label>
                                    <input
                                        type="number"
                                        value={itemFormData.cost_price}
                                        onChange={(e) => setItemFormData({ ...itemFormData, cost_price: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>New Image (Leave blank to keep current)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setItemFormData({ ...itemFormData, image_file: e.target.files[0] })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowEditItemModal(false)}>Cancel</button>
                                <button type="submit" className="submit-btn" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

}
