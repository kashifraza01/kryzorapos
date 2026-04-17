<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Setting;

class AuthController extends Controller
{
    /**
     * Check license/subscription status — ALWAYS returns active / full plan.
     * Licensing system has been removed.
     */
    public function checkLicense(Request $request)
    {
        $allFeatures = [
            'pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
            'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
            'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
            'settings', 'dashboard-full'
        ];

        return response()->json([
            'valid'           => true,
            'is_active'       => true,
            'status'          => 'active',
            'plan'            => 'full',
            'features'        => $allFeatures,
            'expiry_date'     => null,
            'days_left'       => null,
            'message'         => 'All features unlocked',
            'restaurant_name' => Setting::where('key', 'restaurant_name')->value('value') ?? 'KryzoraPOS',
            'plans'           => [],
        ]);
    }

    /**
     * Activate license — no-op, returns success message.
     */
    public function activateLicense(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'All features are already unlocked. No license required.',
        ]);
    }

    /**
     * Verify license — always returns valid / full.
     */
    public function verifyLicense(Request $request)
    {
        $allFeatures = [
            'pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
            'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
            'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
            'settings', 'dashboard-full'
        ];

        return response()->json([
            'valid'    => true,
            'status'   => 'active',
            'plan'     => 'full',
            'features' => $allFeatures,
            'message'  => 'All features unlocked',
        ]);
    }

    /**
     * Login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('pos-token')->plainTextToken;

        $allFeatures = [
            'pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
            'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
            'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
            'settings', 'dashboard-full'
        ];

        return response()->json([
            'user'    => $user->load('role.permissions'),
            'token'   => $token,
            'license' => [
                'is_active' => true,
                'status'    => 'active',
                'plan'      => 'full',
                'features'  => $allFeatures,
                'message'   => 'All features unlocked',
            ],
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }
}
