<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        if ($request->get('paginate')) {
            $perPage = min($request->get('per_page', 50), 100);
            return response()->json(Customer::orderBy('name')->paginate($perPage));
        }
        return response()->json(Customer::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:customers,phone',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
        ]);

        $customer = Customer::create($validated);
        return response()->json($customer, 201);
    }

    public function show($id)
    {
        return response()->json(Customer::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|unique:customers,phone,' . $id,
            'email' => 'nullable|email',
            'address' => 'nullable|string',
        ]);

        $customer->update($validated);
        return response()->json($customer);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();
        return response()->json(['message' => 'Customer deleted']);
    }

    public function search(Request $request)
    {
        $query = $request->get('q');
        $searchTerm = "%{$query}%";
        $customers = Customer::where('name', 'like', $searchTerm)
            ->orWhere('phone', 'like', $searchTerm)
            ->get();
        return response()->json($customers);
    }
}
