import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Printer, Loader2, MessageCircle, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Receipt from '../components/Receipt';
import { shareOrderOnWhatsApp } from '../utils/whatsapp';

export default function OrderHistory() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [settings, setSettings] = useState({});
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const handleEdit = (order) => {
        if (order.status === 'completed' && !window.confirm('This order is already completed. Editing will reopen it. Continue?')) return;
        navigate('/pos', { state: { editingOrder: order } });
    };

    const fetchOrders = async (pageNum = 1) => {
        try {
            const [ordersRes, settingsRes] = await Promise.all([
                api.get(`/reports/recent-orders?page=${pageNum}&per_page=50`),
                api.get('/settings')
            ]);
            setOrders(ordersRes.data.data || ordersRes.data);
            setLastPage(ordersRes.data.last_page || 1);
            setPage(ordersRes.data.current_page || 1);
            setSettings(settingsRes.data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesSearch = searchTerm === '' ||
            String(order.id).includes(searchTerm) ||
            order.order_type.includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handlePrint = (order) => {
        setSelectedOrder(order);
        setTimeout(() => window.print(), 300);
    };

    const handleWhatsAppShare = (order) => {
        const phone = prompt('Enter Customer WhatsApp Number (e.g. 923202091747)', '');
        if (phone) {
            shareOrderOnWhatsApp(order, settings.restaurant_name, phone);
        }
    };

    const handleRefund = async (order) => {
        if (order.status === 'cancelled' || !order.items || order.items.length === 0) {
            alert('This order cannot be refunded.');
            return;
        }
        
        const itemNames = order.items.map(i => i.menu_item?.name || i.item_name).join(', ');
        const itemToRefund = prompt(`Enter the name of the item to refund:\n(${itemNames})`, '');
        if (!itemToRefund) return;
        
        const targetItem = order.items.find(i => 
            (i.menu_item?.name || i.item_name).toLowerCase().includes(itemToRefund.toLowerCase())
        );
        
        if (!targetItem) {
            alert('Item not found in order.');
            return;
        }
        
        const qty = parseInt(prompt(`How many ${targetItem.menu_item?.name || targetItem.item_name} to refund? (Max: ${targetItem.quantity})`, '1') || '0');
        if (qty > targetItem.quantity || qty < 1) {
            alert('Invalid quantity.');
            return;
        }

        if (window.confirm(`Refund ${qty}x ${targetItem.menu_item?.name || targetItem.item_name}?`)) {
            try {
                await api.post(`/orders/${order.id}/refund`, {
                    items: [{ order_item_id: targetItem.id, refund_quantity: qty }],
                    restock: true
                });
                alert('Refund processed successfully!');
                fetchOrders(page);
            } catch (e) {
                alert('Refund failed: ' + (e.response?.data?.error || e.message));
            }
        }
    };

    if (loading) {
        return <div className="loading"><Loader2 className="animate-spin" /> Loading Order History...</div>;
    }

    return (
        <div className="orders-page">
            <Receipt order={selectedOrder} />

            <div className="page-header">
                <div className="header-title">
                    <h2>Order History</h2>
                    <p className="text-muted">View and manage all past orders</p>
                </div>
            </div>

            <div className="inventory-controls" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="search-bar inventory-search" style={{ flex: 1 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search by order number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="order-type-tabs" style={{ display: 'flex', gap: '0.5rem' }}>
                    {['all', 'pending', 'cooking', 'ready', 'completed'].map(status => (
                        <button
                            key={status}
                            className={`type-btn ${filterStatus === status ? 'active' : ''}`}
                            onClick={() => setFilterStatus(status)}
                            style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Type</th>
                            <th>Table</th>
                            <th>Cashier</th>
                            <th>Waiter</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Payment</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr><td colSpan="11" className="text-center" style={{ padding: '2rem' }}>No orders found.</td></tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td><strong>#{order.id}</strong></td>
                                    <td style={{ textTransform: 'capitalize' }}>{order.order_type}</td>
                                    <td>{order.table ? order.table.table_number : '-'}</td>
                                    <td>{order.user?.name || '-'}</td>
                                    <td>{order.waiter?.name || '-'}</td>
                                    <td>{order.items?.length || 0} items</td>
                                    <td><strong>Rs. {Number(order.total_amount).toLocaleString()}</strong></td>
                                    <td>
                                        <span className={`status-badge ${order.payment_status === 'paid' ? 'ok' : 'low'}`}>
                                            {order.payment_status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${order.status === 'completed' ? 'ok' : order.status === 'pending' ? 'low' : ''}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>{new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>
                                        <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="icon-btn-sm" title="Edit Order" onClick={() => handleEdit(order)}>
                                                <Edit3 size={16} />
                                            </button>
                                            <button className="icon-btn-sm" title="Print Receipt" onClick={() => handlePrint(order)}>
                                                <Printer size={16} />
                                            </button>
                                            <button className="icon-btn-sm" title="Send via WhatsApp" onClick={() => handleWhatsAppShare(order)} style={{ color: '#25D366' }}>
                                                <MessageCircle size={16} />
                                            </button>
                                            {order.status !== 'cancelled' && (
                                                <button className="icon-btn-sm" title="Partial Refund" onClick={() => handleRefund(order)} style={{ color: '#ef4444' }}>
                                                    R
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {lastPage > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        className="type-btn"
                        disabled={page <= 1}
                        onClick={() => fetchOrders(page - 1)}
                    >
                        ← Previous
                    </button>
                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                        Page {page} of {lastPage}
                    </span>
                    <button
                        className="type-btn"
                        disabled={page >= lastPage}
                        onClick={() => fetchOrders(page + 1)}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
