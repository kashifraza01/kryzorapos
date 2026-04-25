<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MenuController extends Controller
{
    public function index()
    {
        $categories = MenuCategory::with('items')->get();
        return response()->json($categories);
    }

    public function categories()
    {
        $categories = MenuCategory::whereRaw('is_active = true')->get();
        return response()->json($categories);
    }

    public function itemsByCategory($categoryId)
    {
        $items = MenuItem::where('category_id', $categoryId)
            ->whereRaw('is_available = true')
            ->get();
        return response()->json($items);
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'image_file' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $data = ['name' => $validated['name']];

        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('categories', 'public');
            $data['image'] = $path;
        }

        $category = MenuCategory::create($data);
        return response()->json($category, 201);
    }

    public function storeItem(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:menu_categories,id',
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'image_file' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'stock_type' => 'nullable|string',
        ]);

        $data = $request->except('image_file');

        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('items', 'public');
            $data['image'] = $path;
        }

        $item = MenuItem::create($data);
        return response()->json($item, 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $category = MenuCategory::findOrFail($id);
        
        $data = $request->only(['name', 'is_active']);

        if ($request->hasFile('image_file')) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $path = $request->file('image_file')->store('categories', 'public');
            $data['image'] = $path;
        }

        $category->update($data);
        return response()->json($category);
    }

    public function destroyCategory($id)
    {
        $category = MenuCategory::findOrFail($id);
        if ($category->image) {
            Storage::disk('public')->delete($category->image);
        }
        $category->delete();
        return response()->json(['message' => 'Category deleted']);
    }

    public function updateItem(Request $request, $id)
    {
        $item = MenuItem::findOrFail($id);
        $oldData = $item->toArray();
        
        $validated = $request->validate([
            'category_id' => 'nullable|exists:menu_categories,id',
            'name' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'is_available' => 'nullable|boolean',
            'stock_type' => 'nullable|string|in:fixed,inventory',
        ]);

        $data = $request->only(['category_id', 'name', 'price', 'cost_price', 'description', 'is_available', 'stock_type']);

        if ($request->hasFile('image_file')) {
            if ($item->image) {
                Storage::disk('public')->delete($item->image);
            }
            $path = $request->file('image_file')->store('items', 'public');
            $data['image'] = $path;
        }

        $item->update($data);

        // Audit Log
        \App\Utils\Audit::log('item_update', $item, $oldData, $item->fresh()->toArray(), "Updated menu item: {$item->name}");

        return response()->json($item);
    }

    public function destroyItem($id)
    {
        $item = MenuItem::findOrFail($id);
        $oldData = $item->toArray();

        if ($item->image) {
            Storage::disk('public')->delete($item->image);
        }
        $item->delete();

        // Audit Log
        \App\Utils\Audit::log('item_delete', null, $oldData, null, "Deleted menu item: {$oldData['name']}");

        return response()->json(['message' => 'Item deleted']);
    }
    public function getIngredients($id)
    {
        $item = MenuItem::with('ingredients.inventory')->findOrFail($id);
        return response()->json($item->ingredients);
    }

    public function updateIngredients(Request $request, $id)
    {
        $item = MenuItem::findOrFail($id);
        $validated = $request->validate([
            'ingredients' => 'required|array',
            'ingredients.*.inventory_id' => 'required|exists:inventory,id',
            'ingredients.*.quantity_required' => 'required|numeric|min:0.01',
        ]);

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($id, $validated, $item) {
                \App\Models\MenuItemIngredient::where('menu_item_id', $id)->delete();

                foreach ($validated['ingredients'] as $ing) {
                    \App\Models\MenuItemIngredient::create([
                        'menu_item_id' => $id,
                        'inventory_id' => $ing['inventory_id'],
                        'quantity_required' => $ing['quantity_required'],
                    ]);
                }
                
                \App\Utils\Audit::log('ingredients_update', $item, null, $validated['ingredients'], "Updated ingredients for item: {$item->name}");
            });

            return response()->json(['message' => 'Ingredients updated']);
        } catch (\Exception $e) {
            \Log::error('MenuController updateIngredients error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }
}
