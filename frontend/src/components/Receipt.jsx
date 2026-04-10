import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Receipt({ order }) {
    const [settings, setSettings] = useState({
        restaurant_name: 'KryzoraPOS',
        restaurant_address: '',
        restaurant_phone: '',
        footer_text: 'THANK YOU AND COME AGAIN'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data) {
                    setSettings(prev => ({ ...prev, ...res.data }));
                }
            } catch (err) {
                console.error('Failed to fetch receipt settings', err);
            }
        };
        fetchSettings();
    }, []);

    if (!order) return null;

    const totalQty = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return (
        <div id="thermal-receipt" className="receipt-print-only receipt-style">
            <div className="receipt-header">
                {/* Logo Placeholder */}
                <div className="receipt-logo">
                    {/* <img src="/logo.png" alt="Logo" style={{ width: '80px' }} /> */}
                    <div style={{ fontSize: '24pt', fontWeight: 'bold' }}>🍛</div>
                </div>
                <h2 className="receipt-title">{settings.restaurant_name}</h2>
                <p className="receipt-address">{settings.restaurant_address}</p>
                <p className="receipt-phone">{settings.restaurant_phone}</p>

                <h3 className="bill-label">Bill</h3>

                <div className="order-details-grid">
                    <div className="detail-row"><span>Order# :</span> <strong>{order.id}</strong></div>
                    <div className="detail-row"><span>Date :</span> <span>{new Date(order.created_at).toLocaleString()}</span></div>
                    <div className="detail-row"><span>Cashier :</span> <span>{order.user?.name || 'Admin'}</span></div>
                    <div className="detail-row"><span>Waiter :</span> <span>{order.waiter?.name || 'None'}</span></div>
                    <div className="detail-row"><span>Service Type :</span> <span>{order.order_type.toUpperCase()} {order.table ? ` - Table ${order.table.table_number}` : ''}</span></div>
                    <div className="detail-row"><span>Customer :</span> <span>{(order.customer?.name || 'WALK-IN').toUpperCase()}</span></div>
                </div>
            </div>

            <table className="receipt-items-table">
                <thead>
                    <tr>
                        <th align="left">Item Name</th>
                        <th align="center">Qty</th>
                        <th align="center">Price</th>
                        <th align="right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items && order.items.map((item, idx) => (
                        <tr key={idx}>
                            <td>{(item.menu_item?.name || 'Item').toUpperCase()}</td>
                            <td align="center">{item.quantity}</td>
                            <td align="center">{Number(item.unit_price || item.price).toLocaleString()}</td>
                            <td align="right">{Number((item.unit_price || item.price) * item.quantity).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="receipt-totals-section">
                <div className="total-row">
                    <span className="total-label">Subtotal</span>
                    <span className="total-value">{Number(order.subtotal).toLocaleString()}.00</span>
                </div>
                {Number(order.tax_amount) > 0 && (
                    <div className="total-row">
                        <span className="total-label">GST ({order.tax_rate || settings.tax_rate}%)</span>
                        <span className="total-value">{Number(order.tax_amount).toLocaleString()}.00</span>
                    </div>
                )}
                {Number(order.delivery_charge) > 0 && (
                    <div className="total-row">
                        <span className="total-label">Delivery Charges</span>
                        <span className="total-value">{Number(order.delivery_charge).toLocaleString()}.00</span>
                    </div>
                )}
                {Number(order.discount_amount) > 0 && (
                    <div className="total-row">
                        <span className="total-label">Discount</span>
                        <span className="total-value">-{Number(order.discount_amount).toLocaleString()}.00</span>
                    </div>
                )}
                <div className="total-row net-total">
                    <span className="total-label">Net Total</span>
                    <span className="total-value">{Number(order.total_amount).toLocaleString()}.00</span>
                </div>
                <div className="total-row items-count" style={{ borderTop: '1px dashed #000', marginTop: '5px', paddingTop: '5px' }}>
                    <span className="total-label">Total Items</span>
                    <span className="total-value">{totalQty}</span>
                </div>
            </div>

            <div className="receipt-footer">
                <p className="thanks-msg">{settings.footer_text}</p>
                <div className="timestamp-bottom">
                    {new Date().toLocaleString()}
                </div>
                <div className="powered-by">Powered by Kryzora Solutions</div>
            </div>
        </div>
    );
}
