<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class StaffController extends Controller
{
    public function index()
    {
        $staff = User::with('role')->get();
        return response()->json($staff);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role_id' => 'required|exists:roles,id',
            'phone' => 'required|string'
        ]);

        $email = $validated['email'] ?? ($validated['phone'] . '@pos.com');

        $user = User::create([
            'name' => $validated['name'],
            'email' => $email,
            'password' => $validated['password'],
            'role_id' => $validated['role_id'],
            'phone' => $validated['phone'],
        ]);

        return response()->json($user->load('role'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'role_id' => 'sometimes|exists:roles,id',
            'phone' => 'nullable|string',
            'password' => 'nullable|string|min:8'
        ]);

        if (!empty($validated['password'])) {
            // No Hash::make — User model 'hashed' cast auto-hashes
        } else {
            unset($validated['password']);
        }

        $user->update($validated);
        return response()->json($user->load('role'));
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        if ($user->id === 1) {
            return response()->json(['error' => 'Cannot delete main admin'], 403);
        }
        $user->delete();
        return response()->json(['message' => 'Staff member removed']);
    }
}
