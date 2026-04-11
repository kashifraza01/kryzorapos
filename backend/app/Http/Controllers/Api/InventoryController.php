<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        if ($request->get('paginate')) {
            $perPage = min($request->get('per_page', 50), 100);
            return response()->json(Inventory::orderBy('item_name')->paginate($perPage));
        }

        return response()->json(Inventory::orderBy('item_name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'required|string|max:50',
            'low_stock_threshold' => 'required|numeric|min:0',
        ]);

        $item = Inventory::create($validated);
        return response()->json($item, 201);
    }

    public function updateStock(Request $request, $id)
    {
        $validated = $request->validate([
            'change' => 'required|numeric',
            'type' => 'required|in:restock,usage,wastage,correction',
            'reason' => 'nullable|string',
        ]);

        $item = Inventory::findOrFail($id);
        $oldQty = $item->quantity;

        try {
            return DB::transaction(function () use ($item, $validated, $oldQty) {
                if ($validated['type'] === 'restock' || $validated['type'] === 'correction') {
                    $item->increment('quantity', $validated['change']);
                }
                else {
                    $item->decrement('quantity', abs($validated['change']));
                }

                InventoryLog::create([
                    'inventory_id' => $item->id,
                    'quantity_change' => $validated['change'],
                    'type' => $validated['type'],
                    'reason' => $validated['reason'],
                    'user_id' => auth()->id(),
                ]);

                \App\Utils\Audit::log('stock_updated', $item, ['qty' => $oldQty], ['qty' => $item->fresh()->quantity], "Stock {$validated['type']}: {$validated['change']} {$item->unit}");

                return response()->json($item);
            });
        }
        catch (\Exception $e) {
            \Log::error('Inventory updateStock error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }

    public function lowStockAlerts()
    {
        $items = Inventory::whereColumn('quantity', '<', 'low_stock_threshold')->get();
        return response()->json($items);
    }

    public function destroy($id)
    {
        $item = Inventory::findOrFail($id);
        \App\Utils\Audit::log('item_deleted', $item, $item->toArray(), null, "Inventory item removed: {$item->item_name}");
        $item->delete();
        return response()->json(['message' => 'Item removed from inventory']);
    }
}
