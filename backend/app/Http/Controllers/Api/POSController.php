<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\RestaurantTable;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Shift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class POSController extends Controller
{
    public function listTables()
    {
        $tables = RestaurantTable::all();
        return response()->json($tables);
    }

    /**
     * List orders for order history - with filters
     */
    public function indexOrders(Request $request)
    {
        $query = Order::with(['customer', 'table', 'waiter', 'payments', 'items.menu_item'])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->order_type) {
            $query->where('order_type', $request->order_type);
        }

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->per_page ?? 50;
        $orders = $query->paginate($perPage);

        return response()->json($orders);
    }

    /**
     * Show single order details
     */
    public function showOrder($id)
    {
        $order = Order::with([
            'customer', 
            'table', 
            'waiter', 
            'user',
            'payments', 
            'items.menu_item.ingredients.inventory'
        ])->findOrFail($id);

        return response()->json($order);
    }

    public function storeTable(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
        ]);

        $table = RestaurantTable::create([
            'table_number' => $validated['name'],
            'capacity'     => $validated['capacity'],
            'status'       => 'available',
        ]);

        return response()->json($table, 201);
    }

    public function storeOrder(Request $request)
    {
        $validated = $request->validate([
            'id'              => 'nullable|exists:orders,id', // For updates
            'table_id'        => 'nullable|exists:restaurant_tables,id',
            'customer_id'     => 'nullable|exists:customers,id',
            'waiter_id'       => 'nullable|exists:users,id',
            'order_type'      => 'required|in:dine-in,takeaway,delivery',
            'items'           => 'required|array|min:1',
            'items.*.id'      => 'required|exists:menu_items,id',
            'items.*.quantity'=> 'required|numeric|min:0.01',
            'items.*.price'   => 'required|numeric|min:0',
            'subtotal'        => 'required|numeric|min:0',
            'tax'             => 'required|numeric|min:0',
            'discount'        => 'nullable|numeric|min:0',
            'delivery_charge' => 'nullable|numeric|min:0',
            'total'           => 'required|numeric|min:0',
            'delivery_address'=> 'nullable|string|max:500',
        ]);

        try {
            return DB::transaction(function () use ($validated) {
                if (isset($validated['id'])) {
                    $order = Order::with('items.menu_item.ingredients.inventory')->findOrFail($validated['id']);
                    
                    // REVERT Inventory for old items
                    foreach ($order->items as $oldItem) {
                        if ($oldItem->menu_item && $oldItem->menu_item->ingredients) {
                            foreach ($oldItem->menu_item->ingredients as $ingredient) {
                                if ($ingredient->inventory) {
                                    $usage = $ingredient->quantity_required * $oldItem->quantity;
                                    $ingredient->inventory->increment('quantity', $usage);
                                }
                            }
                        }
                    }
                    
                    // Delete old items
                    $order->items()->delete();
                    
                    // Update Order
                    $order->update([
                        'customer_id'     => $validated['customer_id'] ?? null,
                        'table_id'        => $validated['table_id'] ?? null,
                        'waiter_id'       => $validated['waiter_id'] ?? null,
                        'order_type'      => $validated['order_type'],
                        'subtotal'        => $validated['subtotal'],
                        'tax_amount'      => $validated['tax'],
                        'discount_amount' => $validated['discount'] ?? 0,
                        'delivery_charge' => $validated['delivery_charge'] ?? 0,
                        'total_amount'    => $validated['total'],
                        'delivery_address'=> $validated['delivery_address'] ?? null,
                    ]);
                } else {
                    // Link to active shift if one is open
                    $activeShift = Shift::where('user_id', auth()->id())
                        ->where('status', 'open')
                        ->latest()
                        ->first();

                    $order = Order::create([
                        'user_id'         => auth()->id(),
                        'shift_id'        => $activeShift?->id,
                        'customer_id'     => $validated['customer_id'] ?? null,
                        'table_id'        => $validated['table_id'] ?? null,
                        'waiter_id'       => $validated['waiter_id'] ?? null,
                        'order_type'      => $validated['order_type'],
                        'status'          => 'pending',
                        'payment_status'  => 'unpaid',
                        'subtotal'        => $validated['subtotal'],
                        'tax_amount'      => $validated['tax'],
                        'discount_amount' => $validated['discount'] ?? 0,
                        'delivery_charge' => $validated['delivery_charge'] ?? 0,
                        'total_amount'    => $validated['total'],
                        'delivery_address'=> $validated['delivery_address'] ?? null,
                    ]);
                }

                foreach ($validated['items'] as $itemData) {
                    $menuItem = MenuItem::with('ingredients.inventory')->findOrFail($itemData['id']);

                    // CHECK: Sufficient Stock
                    foreach ($menuItem->ingredients as $ingredient) {
                        $usage = $ingredient->quantity_required * $itemData['quantity'];
                        $inventory = $ingredient->inventory;
                        if ($inventory && $inventory->quantity < $usage) {
                            throw new \Exception("Insufficient stock for component: {$inventory->item_name}. Needed: {$usage} {$inventory->unit}, Available: {$inventory->quantity} {$inventory->unit}");
                        }
                    }

                    OrderItem::create([
                        'order_id'    => $order->id,
                        'menu_item_id'=> $menuItem->id,
                        'quantity'    => $itemData['quantity'],
                        'unit_price'  => $itemData['price'],
                        'subtotal'    => $itemData['price'] * $itemData['quantity'],
                        'notes'       => $itemData['notes'] ?? null,
                    ]);

                    // Deduct Inventory for linked ingredients
                    foreach ($menuItem->ingredients as $ingredient) {
                        $usage     = $ingredient->quantity_required * $itemData['quantity'];
                        $inventory = $ingredient->inventory;
                        if ($inventory) {
                            $inventory->decrement('quantity', $usage);
                            \App\Models\InventoryLog::create([
                                'inventory_id'    => $inventory->id,
                                'quantity_change' => -$usage,
                                'type'            => 'usage',
                                'reason'          => (isset($validated['id']) ? "Order #{$order->id} (Update)" : "Order #{$order->id}") . " - {$menuItem->name}",
                                'user_id'         => auth()->id(),
                            ]);
                        }
                    }
                }

                if (!empty($validated['table_id'])) {
                    RestaurantTable::where('id', $validated['table_id'])->update(['status' => 'occupied']);
                }

                return response()->json($order->load('items.menu_item', 'user', 'waiter'), 201);
            });
        } catch (\Exception $e) {
            \Log::error('POS storeOrder error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }

    public function processPayment(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);

        if ($order->payment_status === 'paid') {
            return response()->json(['error' => 'Order is already paid'], 422);
        }

        // Support split billing: accept array of payments
        // Single payment: { payment_method, amount_paid, transaction_reference }
        // Split payment:  { payments: [{ method, amount, reference }, ...] }
        $payments = [];

        if ($request->has('payments') && is_array($request->payments)) {
            // Split billing mode
            foreach ($request->payments as $p) {
                $payments[] = [
                    'method'    => $p['method'] ?? 'cash',
                    'amount'    => $p['amount'] ?? 0,
                    'reference' => $p['reference'] ?? null,
                ];
            }
        } else {
            // Single payment mode (backward compatible)
            $validated = $request->validate([
                'payment_method'        => 'required|in:cash,card,easypaisa,jazzcash',
                'amount_paid'           => 'required|numeric|min:0',
                'transaction_reference' => 'nullable|string|max:100',
            ]);
            $payments[] = [
                'method'    => $validated['payment_method'],
                'amount'    => $validated['amount_paid'],
                'reference' => $validated['transaction_reference'] ?? null,
            ];
        }

        // Validate total covers order amount
        $totalPaid = array_sum(array_column($payments, 'amount'));
        if ($totalPaid < $order->total_amount) {
            return response()->json([
                'error'    => 'Insufficient payment. Order total: Rs.' . $order->total_amount . ', Paid: Rs.' . $totalPaid,
                'required' => $order->total_amount,
                'paid'     => $totalPaid,
            ], 422);
        }

        try {
            return DB::transaction(function () use ($payments, $order) {
                // Get active shift for linking
                $activeShift = Shift::where('user_id', auth()->id())
                    ->where('status', 'open')
                    ->latest()
                    ->first();

                foreach ($payments as $p) {
                    if ($p['amount'] > 0) {
                        Payment::create([
                            'order_id'              => $order->id,
                            'shift_id'              => $activeShift?->id,
                            'payment_method'        => $p['method'],
                            'amount'                => $p['amount'],
                            'transaction_reference' => $p['reference'],
                            'status'                => 'success',
                        ]);
                    }
                }

                $order->update(['payment_status' => 'paid', 'status' => 'completed']);

                if ($order->table_id) {
                    RestaurantTable::where('id', $order->table_id)->update(['status' => 'available']);
                }

                // Fire FBR API Integration
                \App\Services\FBRService::generateFBRInvoice($order);

                return response()->json([
                    'message'        => 'Payment processed successfully',
                    'split_payments' => count($payments) > 1,
                    'order'          => $order->fresh()->load('items.menu_item', 'customer', 'payments'),
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('POS processPayment error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }

    public function updateTablePosition(Request $request, $id)
    {
        $request->validate([
            'x_pos' => 'required|numeric',
            'y_pos' => 'required|numeric',
        ]);

        $table = RestaurantTable::findOrFail($id);
        $table->update([
            'x_pos' => $request->x_pos,
            'y_pos' => $request->y_pos,
        ]);
        return response()->json($table);
    }

    public function refundItem(Request $request, $orderId)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.order_item_id' => 'required|exists:order_items,id',
            'items.*.refund_quantity' => 'required|numeric|min:1',
            'restock' => 'required|boolean'
        ]);

        try {
            return DB::transaction(function () use ($validated, $orderId) {
                $order = Order::with('items.menu_item.ingredients.inventory', 'payments')->findOrFail($orderId);
                
                $totalRefundValue = 0;

                foreach ($validated['items'] as $refundItemData) {
                    $orderItem = $order->items->where('id', $refundItemData['order_item_id'])->first();
                    
                    if (!$orderItem) continue;

                    $refundQty = $refundItemData['refund_quantity'];
                    if ($refundQty > $orderItem->quantity) {
                        return response()->json(['error' => 'Cannot refund more than ordered quantity'], 422);
                    }

                    $refundValue = $orderItem->unit_price * $refundQty;
                    $totalRefundValue += $refundValue;

                    // Update order item quantity
                    if ($orderItem->quantity == $refundQty) {
                        $orderItem->delete();
                    } else {
                        $orderItem->update([
                            'quantity' => $orderItem->quantity - $refundQty,
                            'subtotal' => $orderItem->unit_price * ($orderItem->quantity - $refundQty)
                        ]);
                    }

                    // Restock inventory logically if required
                    if ($validated['restock'] && $orderItem->menu_item && $orderItem->menu_item->ingredients) {
                        foreach ($orderItem->menu_item->ingredients as $ingredient) {
                            $inventory = $ingredient->inventory;
                            if ($inventory) {
                                $amountToRestock = $ingredient->quantity_required * $refundQty;
                                $inventory->increment('quantity', $amountToRestock);
                                \App\Models\InventoryLog::create([
                                    'inventory_id'    => $inventory->id,
                                    'quantity_change' => $amountToRestock,
                                    'type'            => 'adjustment', // meaning restock basically
                                    'reason'          => "Refund Restock (Order #{$order->id}) - {$orderItem->menu_item->name}",
                                    'user_id'         => auth()->id(),
                                ]);
                            }
                        }
                    }
                }

                // Append refund to the order totals
                $order->subtotal -= $totalRefundValue;
                $order->total_amount -= $totalRefundValue;
                $order->save();

                // If fully refunded, mark status as cancelled
                if ($order->items()->count() === 0) {
                    $order->update(['status' => 'cancelled']);
                }

                // Add a negative payment row to balance cash flow safely
                if ($totalRefundValue > 0) {
                    $activeShift = Shift::where('user_id', auth()->id())
                        ->where('status', 'open')
                        ->latest()
                        ->first();
                        
                    Payment::create([
                        'order_id'              => $order->id,
                        'shift_id'              => $activeShift?->id,
                        'payment_method'        => 'cash', // Assuming cash refund
                        'amount'                => -$totalRefundValue,
                        'transaction_reference' => 'Partial Refund',
                        'status'                => 'success',
                    ]);
                }

                return response()->json([
                    'message' => 'Refund processed successfully',
                    'order'   => $order->fresh()->load('items.menu_item', 'customer', 'payments')
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('POS refundItem error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }
}
