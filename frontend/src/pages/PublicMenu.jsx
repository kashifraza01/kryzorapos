import React, { useState, useEffect } from 'react';
import { ShoppingCart, Utensils, Star, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function PublicMenu() {
    // Get table ID from URL query f.e. ?table=1
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table') || 1;
    
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ordered, setOrdered] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            // Using direct axios because this is a public route outside our standard 'api' instance potentially
            const res = await axios.get('http://127.0.0.1:8111/api/public-menu');
            setCategories(res.data);
            if (res.data.length > 0) setActiveCategory(res.data[0].id);
        } catch (err) {
            console.error('Failed to fetch menu', err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const placeOrder = async () => {
        if (cart.length === 0) return;
        try {
            await axios.post('http://127.0.0.1:8111/api/public-menu/order', {
                table_id: tableId,
                items: cart.map(i => ({ id: i.id, quantity: i.quantity }))
            });
            setOrdered(true);
            setCart([]);
        } catch (err) {
            alert('Failed to place order. Please call a waiter.');
        }
    };

    if (loading) return <div className="loading"><Loader2 className="animate-spin" /> Loading Menu...</div>;

    if (ordered) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-white p-6 text-center">
                <CheckCircle size={80} color="var(--success)" className="mb-4" />
                <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
                <p className="text-muted mb-6">Your order has been sent to the kitchen. Please relax while we prepare your meal.</p>
                <button 
                    className="checkout-btn px-8" 
                    onClick={() => setOrdered(false)}
                >
                    Order More Items
                </button>
            </div>
        );
    }

    return (
        <div className="public-menu bg-gray-50 min-h-screen">
            <header className="bg-white p-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-red-500 text-white p-2 rounded-lg font-bold">KPOS</div>
                    <span className="font-bold text-lg">Table #{tableId}</span>
                </div>
                {cart.length > 0 && (
                    <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        <ShoppingCart size={16} /> Rs. {cartTotal.toLocaleString()}
                    </div>
                )}
            </header>

            <div className="p-4">
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    {categories.map(cat => (
                        <button 
                            key={cat.id}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-red-500 text-white' : 'bg-white text-gray-600'}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="mt-4 space-y-4 pb-24">
                    {categories.find(c => c.id === activeCategory)?.items.map(item => (
                        <div key={item.id} className="bg-white rounded-xl p-3 flex gap-4 shadow-sm">
                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                <img 
                                    src={item.image_url ? item.image_url : 'https://via.placeholder.com/150'} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800">{item.name}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-2">{item.description || 'Delicious freshly prepared dish.'}</p>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-bold text-red-500">Rs. {Number(item.price).toLocaleString()}</span>
                                    <button 
                                        className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold"
                                        onClick={() => addToCart(item)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {cart.length > 0 && !ordered && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20">
                    <button 
                        className="w-full bg-red-600 text-white py-4 rounded-xl font-bold flex justify-between px-6"
                        onClick={placeOrder}
                    >
                        <span>View Order ({cart.length})</span>
                        <span>Place Order • Rs. {cartTotal.toLocaleString()}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
