<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Services\LicenseService;
use App\Services\SubscriptionService;
use App\Models\Setting;

class AuthController extends Controller
{
    /**
     * Determine if running in cloud mode.
     */
    private function isCloud(): bool
    {
        return config('database.default') !== 'sqlite';
    }

    /**
     * Check current license/subscription status
     */
    public function checkLicense(Request $request)
    {
        if ($this->isCloud()) {
            $user = $request->user();
            if (!$user) {
                // Return 'is_active' => true to bypass the License screen and show the Login screen in cloud mode.
                return response()->json([
                    'valid' => true, 'is_active' => true,
                    'status' => 'unauthenticated', 'plan' => null,
                    'features' => [], 'message' => 'Not authenticated.',
                    'plans' => SubscriptionService::getPlans(),
                ]);
            }
            $sub = SubscriptionService::check($user);
            return response()->json([
                'valid'           => $sub['valid'],
                'is_active'       => $sub['valid'],
                'status'          => $sub['status'],
                'plan'            => $sub['plan'],
                'features'        => $sub['features'] ?? [],
                'expiry_date'     => $sub['expiry'] ?? null,
                'days_left'       => $sub['days_left'] ?? null,
                'message'         => $sub['message'],
                'restaurant_name' => Setting::where('key', 'restaurant_name')->value('value') ?? 'KryzoraPOS',
                'plans'           => SubscriptionService::getPlans(),
            ]);
        }

        // Offline mode — use LicenseService
        $license = LicenseService::check();
        return response()->json([
            'valid'           => $license['valid'],
            'is_active'       => $license['valid'],
            'status'          => $license['status'],
            'plan'            => $license['plan'],
            'features'        => $license['features'] ?? [],
            'expiry_date'     => $license['expiry'] ?? null,
            'days_left'       => $license['days_left'] ?? null,
            'message'         => $license['message'],
            'restaurant_name' => Setting::where('key', 'restaurant_name')->value('value') ?? 'KryzoraPOS',
            'plans'           => LicenseService::getPlans(),
        ]);
    }

    /**
     * Activate a new license key (offline only)
     */
    public function activateLicense(Request $request)
    {
        if ($this->isCloud()) {
            return response()->json(['message' => 'License activation is not available in cloud mode.'], 400);
        }

        $request->validate([
            'license_key' => 'required|string|min:5'
        ]);

        $result = LicenseService::activate($request->license_key);

        if ($result['success']) {
            return response()->json($result);
        }

        return response()->json($result, 422);
    }

    /**
     * Verify license/subscription (called periodically by frontend)
     */
    public function verifyLicense(Request $request)
    {
        if ($this->isCloud()) {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'valid' => false, 'status' => 'unauthenticated',
                    'plan' => null, 'features' => [],
                    'message' => 'Not authenticated.',
                ]);
            }
            $sub = SubscriptionService::check($user);
            return response()->json([
                'valid'    => $sub['valid'],
                'status'   => $sub['status'],
                'plan'     => $sub['plan'],
                'features' => $sub['features'] ?? [],
                'message'  => $sub['message'],
            ]);
        }

        $license = LicenseService::check();
        return response()->json([
            'valid'    => $license['valid'],
            'status'   => $license['status'],
            'plan'     => $license['plan'],
            'features' => $license['features'] ?? [],
            'message'  => $license['message'],
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

        if ($this->isCloud()) {
            $sub = SubscriptionService::check($user);
            return response()->json([
                'user'    => $user->load('role.permissions'),
                'token'   => $token,
                'license' => [
                    'is_active' => $sub['valid'],
                    'status'    => $sub['status'],
                    'plan'      => $sub['plan'],
                    'features'  => $sub['features'] ?? [],
                    'message'   => $sub['message'],
                ],
            ]);
        }

        $license = LicenseService::check();
        return response()->json([
            'user'    => $user->load('role.permissions'),
            'token'   => $token,
            'license' => [
                'is_active' => $license['valid'],
                'status'    => $license['status'],
                'plan'      => $license['plan'],
                'features'  => $license['features'] ?? [],
                'message'   => $license['message'],
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
