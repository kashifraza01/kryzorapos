/**
 * WhatsApp Integration Utility for KryzoraPOS
 * Handles formatting order details for sharing via WhatsApp Web or App
 */

export const shareOrderOnWhatsApp = (order, restaurantName, phone = '') => {
    if (!order) return;

    // Formatting Items
    const itemsText = order.items.map(item =>
        `- ${item.menu_item?.name || 'Item'} x ${item.quantity} = Rs. ${Number(item.subtotal).toLocaleString()}`
    ).join('\n');

    const dateStr = new Date(order.created_at).toLocaleString();
    const serviceDetails = `${order.order_type.toUpperCase()}${order.table ? ` (Table ${order.table.table_number})` : ''}`;

    // Message Body
    const message =
        `*BILL FROM ${restaurantName.toUpperCase()}*\n` +
        `--------------------------\n` +
        `*Order #:* ${order.id}\n` +
        `*Date:* ${dateStr}\n` +
        `*Service:* ${serviceDetails}\n` +
        `--------------------------\n` +
        `${itemsText}\n` +
        `--------------------------\n` +
        `*Net Total: Rs. ${Number(order.total_amount).toLocaleString()}*\n\n` +
        `*THANK YOU AND COME AGAIN!*\n` +
        `📍 ${restaurantName}`;

    const encodedMessage = encodeURIComponent(message);

    // Formatting target phone (Pakistan standard: 923xxxxxxxxx)
    let targetPhone = phone.replace(/\D/g, '');
    if (targetPhone.startsWith('0')) {
        targetPhone = '92' + targetPhone.substring(1);
    } else if (!targetPhone.startsWith('92') && targetPhone.length === 10) {
        targetPhone = '92' + targetPhone;
    }

    const whatsappUrl = targetPhone
        ? `https://wa.me/${targetPhone}?text=${encodedMessage}`
        : `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
};
