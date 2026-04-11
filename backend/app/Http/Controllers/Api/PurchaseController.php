<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Inventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function index()
    {
        return response()->json(Purchase::with(['supplier', 'items.inventory'])->orderByDesc('id')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'purchase_date' => 'required|date',
            'payment_status' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.inventory_id' => 'required|exists:inventory,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.cost_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $total = 0;
            foreach ($validated['items'] as $item) {
                $total += $item['quantity'] * $item['cost_price'];
            }

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'user_id' => auth()->id(),
                'total_amount' => $total,
                'payment_status' => $validated['payment_status'],
                'purchase_date' => $validated['purchase_date'],
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'inventory_id' => $item['inventory_id'],
                    'quantity' => $item['quantity'],
                    'cost_price' => $item['cost_price'],
                    'subtotal' => $item['quantity'] * $item['cost_price']
                ]);

                // Update Inventory Stock
                $inventory = Inventory::find($item['inventory_id']);
                $inventory->increment('quantity', $item['quantity']);
            }

            return response()->json($purchase->load('items'), 201);
        });
    }

    public function show($id)
    {
        return response()->json(Purchase::with(['supplier', 'items.inventory'])->findOrFail($id));
    }
}
