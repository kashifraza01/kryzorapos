<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rider;
use Illuminate\Http\Request;

class RiderController extends Controller
{
    public function index()
    {
        return response()->json(Rider::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'phone' => 'required|string|unique:riders,phone',
            'is_active' => 'boolean',
        ]);

        $rider = Rider::create($validated);
        return response()->json($rider, 201);
    }

    public function show(Rider $rider)
    {
        return response()->json($rider);
    }

    public function update(Request $request, Rider $rider)
    {
        $validated = $request->validate([
            'name' => 'string|max:100',
            'phone' => 'string|unique:riders,phone,' . $rider->id,
            'is_active' => 'boolean',
        ]);

        $rider->update($validated);
        return response()->json($rider);
    }

    public function destroy(Rider $rider)
    {
        $rider->delete();
        return response()->json(['message' => 'Rider deleted']);
    }
}
