import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Utensils, Users, ShoppingBag, Search, Plus, Minus,
    Trash2, CreditCard, Wallet, Smartphone, Percent,
    MapPin, Truck, Table2, Info, Loader2, Lock, ShoppingCart, Banknote, Printer, Send, X, QrCode, CheckCircle2, Edit3
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { shareOrderOnWhatsApp as sendOrderToWhatsApp } from '../utils/whatsapp';
import api from '../api';
import Receipt from '../components/Receipt';

export default function POS() {
    // Basic States
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]); // Currently displayed items
    const [allMenuItems, setAllMenuItems] = useState([]); // Master list from DB
    const [cart, setCart] = useState([]);
    const [tables, setTables] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [waiters, setWaiters] = useState([]);

    // UI Tracking
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [orderType, setOrderType] = useState('dine-in');
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedWaiter, setSelectedWaiter] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState('flat'); // 'flat' or 'percent'
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryCharges, setDeliveryCharges] = useState(0);

    // Order/Payment Processing
    const [submitting, setSubmitting] = useState(false);
    const [payMethod, setPayMethod] = useState('cash');
    const [transactionId, setTransactionId] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [cashReceived, setCashReceived] = useState('');
    const [changeAmount, setChangeAmount] = useState(0);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [riders, setRiders] = useState([]);
    const [selectedRider, setSelectedRider] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitEntries, setSplitEntries] = useState([{ method: 'cash', amount: '' }, { method: 'card', amount: '' }]);

    // Notifications
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const location = useLocation();
    const navigate = useNavigate();

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    const fetchData = async () => {
        try {
            // Load critical POS data — each call is independent so one failure won't break everything
            const [catRes, menuRes, settingsRes] = await Promise.all([
                api.get('/menu/categories'),
                api.get('/menu/all'),
                api.get('/settings/public'),
            ]);

            setCategories(catRes.data);
            const allItems = menuRes.data.flatMap(cat => cat.items || []);
            setAllMenuItems(allItems);
            setSettings(settingsRes.data);
            setDeliveryCharges(settingsRes.data.delivery_charge || 0);

            if (catRes.data && catRes.data.length > 0 && !selectedCategory) {
                setSelectedCategory(catRes.data[0].id);
            }

            // Load tables separately
            try {
                const tablesRes = await api.get('/tables');
                setTables(tablesRes.data);
            } catch (e) {
                console.warn('Tables not available:', e.response?.status);
            }

            // Load staff/waiters separately
            try {
                const staffRes = await api.get('/staff');
                const waiterStaff = staffRes.data.filter(s => s.role_id === 4 || s.role?.slug === 'waiter' || s.role?.name?.toLowerCase().includes('waiter'));
                setWaiters(waiterStaff);
            } catch (e) {
                console.warn('Staff not available:', e.response?.status);
            }

            // Load Customers
            try {
                const custRes = await api.get('/customers');
                setCustomers(custRes.data);
            } catch (e) {
                console.warn('Customers not available');
            }

            // Load Riders
            try {
                const riderRes = await api.get('/riders');
                setRiders(riderRes.data);
            } catch (e) {
                console.warn('Riders not available');
            }

            // Check if we are editing an order
            if (location.state?.editingOrder) {
                const order = location.state.editingOrder;
                setOrderType(order.order_type);
                setSelectedTable(order.table_id);
                setSelectedWaiter(order.waiter_id);
                setDiscount(order.discount_amount || 0);
                setDeliveryAddress(order.delivery_address || '');
                setDeliveryCharges(order.delivery_charge || 0);

                const orderItems = order.items.map(oi => ({
                    ...oi.menu_item,
                    quantity: oi.quantity,
                    price: oi.unit_price
                }));
                setCart(orderItems);
                setLastOrder(order);
                showToast(`Editing Order #${order.id}`, 'info');
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Items Logic (Prevents Loops)
    useEffect(() => {
        let filtered = allMenuItems;
        if (selectedCategory) {
            filtered = filtered.filter(i => i.category_id === selectedCategory);
        }
        if (searchQuery) {
            filtered = filtered.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        setMenuItems(filtered);
    }, [selectedCategory, searchQuery, allMenuItems]);


    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const taxRate = Number(settings.tax_rate || 0) / 100;
    const tax = Math.round(subtotal * taxRate);
    const activeDeliveryCharges = orderType === 'delivery' ? Number(deliveryCharges) : 0;
    const discountAmount = discountType === 'percent' ? Math.round(subtotal * Number(discount) / 100) : Number(discount);
    const total = Math.max(0, subtotal + tax + activeDeliveryCharges - discountAmount);

    const shareOrderOnWhatsApp = (order, settings) => {
        const phone = prompt('Enter Customer WhatsApp Number (e.g. 923202091747)', '');
        if (phone) {
            sendOrderToWhatsApp(order, settings.restaurant_name, phone);
        }
    };

    const placeOrder = async (isPaid = false) => {
        if (cart.length === 0) return;
        if (orderType === 'dine-in' && !selectedTable) {
            showToast('Please select a table', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const orderData = {
                id: location.state?.editingOrder?.id || null, // ID for update
                table_id: orderType === 'dine-in' ? Number(selectedTable) : null,
                waiter_id: orderType === 'dine-in' && selectedWaiter ? Number(selectedWaiter) : null,
                customer_id: selectedCustomer ? Number(selectedCustomer) : null,
                rider_id: orderType === 'delivery' && selectedRider ? Number(selectedRider) : null,
                order_type: orderType,
                subtotal, tax, discount: discountAmount,
                delivery_charge: activeDeliveryCharges,
                total,
                delivery_address: orderType === 'delivery' ? deliveryAddress : null,
                items: cart.map(item => ({
                    id: item.id || item.menu_item_id, // handle both cart and order formats
                    quantity: item.quantity,
                    price: Number(item.price)
                }))
            };

            const res = await api.post('/orders', orderData);
            const order = res.data;
            setLastOrder(order);

            if (isPaid) {
                if (order.payment_status !== 'paid') {
                    await api.post(`/orders/${order.id}/pay`, {
                        payment_method: payMethod,
                        amount_paid: total,
                        transaction_reference: transactionId
                    });
                }

                showToast(`Order #${order.id} ${location.state?.editingOrder ? 'Updated & ' : ''}Paid!`, 'success');
                setCart([]);
                setDiscount(0);
                setShowPaymentModal(false);
                setShowReceipt(true);

                if (window.confirm('Send Receipt via WhatsApp?')) {
                    shareOrderOnWhatsApp(order, settings);
                }
            } else {
                showToast(`Order #${order.id} ${location.state?.editingOrder ? 'Updated & ' : ''}sent to Kitchen!`, 'success');
                setCart([]);
            }

            if (location.state?.editingOrder) {
                navigate('/order-history'); // Go back after edit
            } else {
                fetchData();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to place order', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const cancelEdit = () => {
        navigate('/pos', { replace: true, state: {} });
        setCart([]);
        setDiscount(0);
        showToast('Edit cancelled', 'info');
    };

    const addSplitEntry = () => setSplitEntries(prev => [...prev, { method: 'cash', amount: '' }]);
    const removeSplitEntry = (idx) => setSplitEntries(prev => prev.filter((_, i) => i !== idx));
    const updateSplitEntry = (idx, field, value) => setSplitEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    const splitTotal = splitEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const handleSplitPay = async () => {
        if (splitTotal < total) {
            showToast(`Split total (Rs.${splitTotal}) is less than order total (Rs.${total})`, 'error');
            return;
        }
        if (cart.length === 0) return;
        setSubmitting(true);
        try {
            const orderData = {
                table_id: orderType === 'dine-in' ? Number(selectedTable) : null,
                waiter_id: orderType === 'dine-in' && selectedWaiter ? Number(selectedWaiter) : null,
                order_type: orderType,
                subtotal, tax, discount: discountAmount,
                delivery_charge: activeDeliveryCharges,
                total,
                delivery_address: orderType === 'delivery' ? deliveryAddress : null,
                items: cart.map(item => ({ id: item.id || item.menu_item_id, quantity: item.quantity, price: Number(item.price) }))
            };
            const res = await api.post('/orders', orderData);
            const order = res.data;
            // Send split payments
            await api.post(`/orders/${order.id}/pay`, {
                payments: splitEntries.filter(e => parseFloat(e.amount) > 0).map(e => ({
                    method: e.method,
                    amount: parseFloat(e.amount),
                    reference: null
                }))
            });
            setLastOrder(order);
            showToast(`Order #${order.id} paid via Split Billing!`, 'success');
            setCart([]);
            setDiscount(0);
            setShowSplitModal(false);
            setSplitEntries([{ method: 'cash', amount: '' }, { method: 'card', amount: '' }]);
            setShowReceipt(true);
            fetchData();
        } catch (error) {
            showToast(error.response?.data?.error || 'Split payment failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================================
    // GLOBAL KEYBOARD SHORTCUTS: Enter = confirm, Esc = close modal
    // ============================================================
    useEffect(() => {
        const handleKeyDown = (e) => {
            // ESC: Close any open modal
            if (e.key === 'Escape') {
                if (showReceipt) { setShowReceipt(false); return; }
                if (showPaymentModal) { setShowPaymentModal(false); setCashReceived(''); setChangeAmount(0); return; }
                if (showSplitModal) { setShowSplitModal(false); return; }
            }

            // ENTER: Confirm action in active modal
            if (e.key === 'Enter') {
                // Don't trigger if user is typing in a text input/textarea (except number inputs for cash)
                const tag = e.target.tagName;
                const type = e.target.type;

                if (showPaymentModal && !submitting) {
                    if (payMethod === 'cash') {
                        if (parseFloat(cashReceived) >= total && cashReceived) {
                            e.preventDefault();
                            placeOrder(true);
                        }
                    } else {
                        e.preventDefault();
                        placeOrder(true);
                    }
                    return;
                }

                if (showSplitModal && !submitting && splitTotal >= total) {
                    e.preventDefault();
                    handleSplitPay();
                    return;
                }

                if (showReceipt) {
                    e.preventDefault();
                    setShowReceipt(false);
                    return;
                }

                // If not in a modal and not typing in search/textarea, checkout with Enter
                if (!showPaymentModal && !showSplitModal && !showReceipt) {
                    if (tag === 'INPUT' && (type === 'text' || type === 'search') && e.target.classList.contains('pos-search-input')) {
                        return; // Let search work normally
                    }
                    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showReceipt, showPaymentModal, showSplitModal, submitting, payMethod, cashReceived, total, splitTotal]);

    if (loading) return <div className="loading">Initializing POS System...</div>;

    return (
        <div className="pos-container">
            {/* Receipt Display */}
            {showReceipt && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <Receipt order={lastOrder} />
                        <div className="flex flex-col gap-2 mt-4">
                            <button className="checkout-btn w-full" onClick={() => window.print()}>
                                <Printer className="inline mr-2" size={18} /> Print Receipt
                            </button>
                            <button className="submit-btn w-full" style={{ backgroundColor: '#25D366' }} onClick={() => shareOrderOnWhatsApp(lastOrder, settings)}>
                                <Smartphone className="inline mr-2" size={18} /> Send to WhatsApp
                            </button>
                            <button className="clear-btn w-full" onClick={() => setShowReceipt(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Enforcement Removed */}

            {/* Toast */}
            {toast.show && <div className={`pos-toast ${toast.type}`}>{toast.message}</div>}

            <div className="menu-section">
                <div className="pos-top-bar">
                    <div className="categories-bar">
                        {categories.map(cat => (
                            <button key={cat.id} className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`} onClick={() => setSelectedCategory(cat.id)}>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    <input type="text" placeholder="Search menu..." className="pos-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                <div className="items-grid">
                    {menuItems.map(item => (
                        <div key={item.id} className="item-card" onClick={() => addToCart(item)}>
                            <div className="item-image">
                                {item.image ? <img src={`/storage/${item.image}`} alt={item.name} /> : <div className="placeholder-image">{item.name[0]}</div>}
                            </div>
                            <div className="item-details">
                                <span className="item-name">{item.name}</span>
                                <span className="item-price">Rs. {Number(item.price).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="cart-section">
                <div className="cart-header">
                    <h3><ShoppingBag className="inline mr-2" /> Current Order</h3>
                    <button className="clear-btn" onClick={() => setCart([])}><Trash2 size={18} /></button>
                </div>

                <div className="order-type-tabs">
                    {['dine-in', 'takeaway', 'delivery'].map(type => (
                        <button key={type} className={`type-btn ${orderType === type ? 'active' : ''}`} onClick={() => setOrderType(type)}>{type}</button>
                    ))}
                </div>

                <div className="customer-selection px-4 py-2 border-b">
                    <label className="text-xs font-bold text-muted uppercase">Select Customer</label>
                    <select
                        className="pos-search-input mt-1 w-full"
                        value={selectedCustomer || ''}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                        <option value="">Walk-in Customer</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                        ))}
                    </select>
                </div>

                {orderType === 'delivery' && (
                    <div className="rider-selection px-4 py-2 border-b">
                        <label className="text-xs font-bold text-muted uppercase">Assign Rider</label>
                        <select
                            className="pos-search-input mt-1 w-full"
                            value={selectedRider || ''}
                            onChange={(e) => setSelectedRider(e.target.value)}
                        >
                            <option value="">No Rider Assigned</option>
                            {riders.map(r => (
                                <option key={r.id} value={r.id}>{r.name} - {r.phone}</option>
                            ))}
                        </select>
                        <textarea 
                            className="pos-search-input mt-2 w-full text-sm" 
                            placeholder="Delivery Address..." 
                            rows="2"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                        />
                    </div>
                )}

                {orderType === 'dine-in' && (
                    <div className="table-selection-area px-4 py-2 border-b">
                        <label className="text-xs font-bold text-muted uppercase">Select Table</label>
                        <select
                            className="pos-search-input mt-1 w-full"
                            value={selectedTable || ''}
                            onChange={(e) => setSelectedTable(e.target.value)}
                        >
                            <option value="">Choose a table...</option>
                            {tables.map(table => (
                                <option key={table.id} value={table.id}>
                                    {table.table_number} ({table.capacity} Persons) - {table.status}
                                </option>
                            ))}
                        </select>
                        <label className="text-xs font-bold text-muted uppercase mt-2 block">Select Waiter</label>
                        <select
                            className="pos-search-input mt-1 w-full"
                            value={selectedWaiter || ''}
                            onChange={(e) => setSelectedWaiter(e.target.value)}
                        >
                            <option value="">No Waiter (Counter Order)</option>
                            {waiters.map(waiter => (
                                <option key={waiter.id} value={waiter.id}>
                                    {waiter.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="cart-items">
                    {cart.map(item => (
                        <div key={item.id} className="cart-item">
                            <div className="cart-item-info">
                                <b>{item.name}</b>
                                <span>Rs. {item.price}</span>
                            </div>
                            <div className="cart-item-controls">
                                <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="cart-footer">
                    <div className="summary-line"><span>Subtotal</span><span>Rs. {subtotal}</span></div>
                    <div className="summary-line"><span>GST ({settings.tax_rate}%)</span><span>Rs. {tax}</span></div>
                    {orderType === 'delivery' && (
                        <div className="summary-line">
                            <span>Delivery</span>
                            <input type="number" className="discount-input" value={deliveryCharges} onChange={(e) => setDeliveryCharges(e.target.value)} />
                        </div>
                    )}
                    <div className="summary-line discount-row">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Percent size={14} /> Discount
                            <span className="discount-type-toggle">
                                <button className={discountType === 'flat' ? 'active' : ''} onClick={() => setDiscountType('flat')}>Rs.</button>
                                <button className={discountType === 'percent' ? 'active' : ''} onClick={() => setDiscountType('percent')}>%</button>
                            </span>
                        </span>
                        <input type="number" className="discount-input" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
                    </div>
                    {discountAmount > 0 && (
                        <div className="summary-line" style={{ color: 'var(--success)' }}>
                            <span>Discount Applied</span>
                            <span>- Rs. {discountAmount.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="total-line"><span>TOTAL</span><span>Rs. {total.toLocaleString()}</span></div>

                    <div className="payment-methods mt-4">
                        {['cash', 'card', 'jazzcash', 'easypaisa'].map(m => (
                            <button key={m} className={`pay-method-btn ${payMethod === m ? 'active' : ''}`} onClick={() => setPayMethod(m)}>
                                {m.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="pos-actions-grid mt-4">
                        {location.state?.editingOrder ? (
                            <>
                                <button className="clear-btn" onClick={cancelEdit} disabled={submitting}>Cancel Edit</button>
                                <button className="checkout-btn" onClick={() => placeOrder(true)} disabled={submitting}>Save Changes</button>
                            </>
                        ) : (
                            <>
                                <button className="kot-btn" onClick={() => placeOrder(false)} disabled={submitting}>KOT (Kitchen)</button>
                                <button className="split-btn" onClick={() => setShowSplitModal(true)} disabled={submitting || cart.length === 0}>Split Pay</button>
                                <button className="checkout-btn" onClick={() => {
                                    if (payMethod === 'cash' || payMethod === 'card') placeOrder(true);
                                    else setShowPaymentModal(true);
                                }} disabled={submitting}>Checkout</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Local Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content payment-modal">
                        <h3>Pay via {payMethod.toUpperCase()}</h3>
                        
                        {payMethod === 'cash' ? (
                            <div className="cash-payment-area py-4">
                                <div className="flex justify-between items-center mb-4 p-4 bg-slate-100 rounded-lg">
                                    <span className="text-lg">Order Total:</span>
                                    <span className="text-2xl font-bold">Rs. {total.toLocaleString()}</span>
                                </div>
                                <label className="block text-sm font-bold text-muted uppercase mb-1">Cash Received</label>
                                <input 
                                    type="number" 
                                    placeholder="Enter amount from customer..." 
                                    className="pos-search-input py-4 text-center text-2xl w-full" 
                                    autoFocus
                                    value={cashReceived} 
                                    onChange={(e) => {
                                        setCashReceived(e.target.value);
                                        const received = parseFloat(e.target.value) || 0;
                                        setChangeAmount(Math.max(0, received - total));
                                    }} 
                                />
                                {parseFloat(cashReceived) > 0 && (
                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                                        <span className="block text-sm text-green-700 font-bold uppercase">Change to Return</span>
                                        <span className="text-4xl font-black text-green-600">Rs. {changeAmount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="qr-container py-6">
                                <QRCodeSVG value={`pay:${settings[`${payMethod}_no`] || '0'}:${total}`} size={200} />
                                <p className="mt-4 font-bold" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                                    {settings[`${payMethod}_no`] || 'Payment Number Not Set'}
                                </p>
                                <p className="text-muted">Scan to pay exact amount: <b>Rs. {total}</b></p>
                                <input type="text" placeholder="Transaction ID" className="pos-search-input mt-4 w-full" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                            </div>
                        )}
                        
                        <button 
                            className="checkout-btn full-width mt-4" 
                            disabled={payMethod === 'cash' && (parseFloat(cashReceived) < total || !cashReceived)}
                            onClick={() => placeOrder(true)}
                        >
                            Confirm Payment
                        </button>
                        <button className="clear-btn mt-2 w-full" onClick={() => {
                            setShowPaymentModal(false);
                            setCashReceived('');
                            setChangeAmount(0);
                        }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Split Billing Modal */}
            {showSplitModal && (
                <div className="modal-overlay">
                    <div className="modal-content split-modal">
                        <h3>Split Billing</h3>
                        <p className="text-muted" style={{ marginBottom: '1rem' }}>Order Total: <strong>Rs. {total.toLocaleString()}</strong></p>

                        <div className="split-entries">
                            {splitEntries.map((entry, idx) => (
                                <div key={idx} className="split-entry">
                                    <select value={entry.method} onChange={(e) => updateSplitEntry(idx, 'method', e.target.value)}>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="easypaisa">EasyPaisa</option>
                                        <option value="jazzcash">JazzCash</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={entry.amount}
                                        onChange={(e) => updateSplitEntry(idx, 'amount', e.target.value)}
                                    />
                                    {splitEntries.length > 2 && (
                                        <button className="split-remove" onClick={() => removeSplitEntry(idx)}><X size={14} /></button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="split-add-btn" onClick={addSplitEntry}><Plus size={14} /> Add Person</button>

                        <div className="split-summary">
                            <div className="split-row"><span>Order Total</span><span>Rs. {total.toLocaleString()}</span></div>
                            <div className="split-row"><span>Split Total</span><span style={{ color: splitTotal >= total ? 'var(--success)' : 'var(--error)' }}>Rs. {splitTotal.toLocaleString()}</span></div>
                            {splitTotal < total && <div className="split-row" style={{ color: 'var(--error)', fontSize: '0.85rem' }}><span>Remaining</span><span>Rs. {(total - splitTotal).toLocaleString()}</span></div>}
                        </div>

                        <div className="split-actions">
                            <button className="checkout-btn" onClick={handleSplitPay} disabled={submitting || splitTotal < total}>
                                {submitting ? 'Processing...' : 'Confirm Split Payment'}
                            </button>
                            <button className="clear-btn" onClick={() => setShowSplitModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
