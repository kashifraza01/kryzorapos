import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import api from '../api';

export default function Kitchen() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [audio] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')); // Notification sound

    const fetchKitchenOrders = async () => {
        try {
            const res = await api.get('/kitchen/orders');
            const newOrders = res.data;
            
            setOrders(prev => {
                if (newOrders.length > prev.length) {
                    audio.play().catch(e => console.log('Sound blocked by browser'));
                }
                return newOrders;
            });
            setLoading(false);
        } catch (e) {
            console.error('Failed to fetch orders', e);
        }
    };

    useEffect(() => {
        fetchKitchenOrders();
        // Poll every 5 seconds (standard for local network POS)
        const interval = setInterval(fetchKitchenOrders, 5000);
        return () => clearInterval(interval);
    }, [audio]);

    const updateStatus = async (id, newStatus) => {
        try {
            await api.post(`/kitchen/orders/${id}/status`, { status: newStatus });
            // Optimistic update for better UX
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
            fetchKitchenOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const countPending = orders.filter(o => o.status === 'pending').length;
    const countCooking = orders.filter(o => o.status === 'cooking').length;

    if (loading) {
        return <div className="loading">Loading Kitchen...</div>;
    }

    return (
        <div className="kitchen-page">
            <div className="page-header">
                <div className="header-title">
                    <h2>Kitchen Display System</h2>
                    <p className="text-muted">Live orders for preparation</p>
                </div>
                <div className="kds-stats">
                    <div className="stat-pill pending">{countPending} New</div>
                    <div className="stat-pill cooking">{countCooking} Cooking</div>
                </div>
            </div>

            <div className="kds-grid">
                {orders.length === 0 ? (
                    <div className="no-orders">No orders for preparation at the moment.</div>
                ) : (
                    orders.map(order => (
                        <div key={order.id} className={`kds-card ${order.status}`}>
                            <div className="kds-card-header">
                                <div>
                                    <span className="order-id">#{order.id}</span>
                                    <h4 className="order-table">{order.table ? order.table.table_number : order.order_type}</h4>
                                </div>
                                <div className="order-time">
                                    <Clock size={14} />
                                    <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>

                            <div className="kds-items">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="kds-item">
                                        <div className="item-qty">{item.quantity}x</div>
                                        <div className="item-details">
                                            <span className="item-name">{item.menu_item?.name || 'Item'}</span>
                                            {item.notes && <span className="item-notes">{item.notes}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="kds-actions">
                                {order.status === 'pending' && (
                                    <button
                                        className="kds-btn start-btn"
                                        onClick={() => updateStatus(order.id, 'cooking')}
                                    >
                                        Start Preparation
                                    </button>
                                )}
                                {order.status === 'cooking' && (
                                    <button
                                        className="kds-btn ready-btn"
                                        onClick={() => updateStatus(order.id, 'ready')}
                                    >
                                        <CheckCircle2 size={18} />
                                        Mark Ready
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <div className="ready-indicator" onClick={() => updateStatus(order.id, 'completed')}>Ready to Serve</div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
