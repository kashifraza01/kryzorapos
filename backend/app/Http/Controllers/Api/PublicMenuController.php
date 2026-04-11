<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicMenuController extends Controller
{
    public function getMenu()
    {
        $categories = MenuCategory::with('items')->get();
        return response()->json($categories);
    }

    public function placeOrder(Request $request)
    {
        $request->validate([
            'table_id' => 'required|exists:restaurant_tables,id',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                $totalAmount = 0;
                $orderItems = [];

                foreach ($request->items as $itemData) {
                    $menuItem = MenuItem::with('ingredients.inventory')->findOrFail($itemData['id']);
                    $totalAmount += $menuItem->price * $itemData['quantity'];

                    // Check sufficient stock for ingredients
                    foreach ($menuItem->ingredients as $ingredient) {
                        $usage = $ingredient->quantity_required * $itemData['quantity'];
                        $inventory = $ingredient->inventory;
                        if ($inventory && $inventory->quantity < $usage) {
                            throw new \Exception("Insufficient stock for: {$inventory->item_name}");
                        }
                    }

                    $orderItems[] = [
                        'menu_item' => $menuItem,
                        'menu_item_id' => $menuItem->id,
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $menuItem->price,
                        'subtotal' => $menuItem->price * $itemData['quantity'],
                    ];
                }

                // Use first admin user as fallback
                $systemUserId = \App\Models\User::first()?->id ?? 1;

                $order = Order::create([
                    'table_id' => $request->table_id,
                    'order_type' => 'dine-in',
                    'status' => 'pending',
                    'payment_status' => 'unpaid',
                    'subtotal' => $totalAmount,
                    'tax_amount' => 0,
                    'discount_amount' => 0,
                    'total_amount' => $totalAmount,
                    'user_id' => $systemUserId,
                    'notes' => 'QR Menu Self-Order',
                ]);

                foreach ($orderItems as $item) {
                    $order->items()->create([
                        'menu_item_id' => $item['menu_item_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    // Deduct inventory for linked ingredients
                    foreach ($item['menu_item']->ingredients as $ingredient) {
                        $usage = $ingredient->quantity_required * $item['quantity'];
                        $inventory = $ingredient->inventory;
                        if ($inventory) {
                            $inventory->decrement('quantity', $usage);
                        }
                    }
                }

                // Update table status
                RestaurantTable::where('id', $request->table_id)->update(['status' => 'occupied']);

                return response()->json([
                    'message' => 'Order placed successfully!',
                    'order_id' => $order->id
                ], 201);
            });
        } catch (\Exception $e) {
            \Log::error('PublicMenu placeOrder error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }
}
