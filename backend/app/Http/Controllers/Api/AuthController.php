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
                    'status' => 'unauthenticated', 'plan' => 'full',
                    'features' => $this->getAllCloudFeatures(), 
                    'message' => 'Cloud mode - all features unlocked',
                    'plans' => [],
                ]);
            }
            // Cloud mode: return ALL features - no subscription needed!
            return response()->json([
                'valid'           => true,
                'is_active'       => true,
                'status'          => 'cloud_active',
                'plan'            => 'full',
                'features'        => $this->getAllCloudFeatures(),
                'expiry_date'     => null,
                'days_left'       => null,
                'message'         => 'Cloud mode - all features unlocked',
                'restaurant_name' => Setting::where('key', 'restaurant_name')->value('value') ?? 'KryzoraPOS',
                'plans'           => [],
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
     * Get all features for cloud mode
     */
    private function getAllCloudFeatures(): array
    {
        return [
            'pos', 'tables', 'customers', 'orders', 'receipts', 'whatsapp',
            'public-menu', 'order-history', 'inventory', 'suppliers', 'purchases',
            'kitchen', 'menu-setup', 'reports', 'staff', 'attendance', 'expenses',
            'settings', 'dashboard-full'
        ];
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
                    'valid' => true, 'status' => 'unauthenticated',
                    'plan' => 'full', 'features' => $this->getAllCloudFeatures(),
                    'message' => 'Cloud mode - all features unlocked',
                ]);
            }
            // Cloud mode: return ALL features
            return response()->json([
                'valid'    => true,
                'status'   => 'cloud_active',
                'plan'     => 'full',
                'features' => $this->getAllCloudFeatures(),
                'message'  => 'Cloud mode - all features unlocked',
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
            // Cloud mode: return ALL features - no subscription needed!
            return response()->json([
                'user'    => $user->load('role.permissions'),
                'token'   => $token,
                'license' => [
                    'is_active' => true,
                    'status'    => 'cloud_active',
                    'plan'      => 'full',
                    'features'  => $this->getAllCloudFeatures(),
                    'message'   => 'Cloud mode - all features unlocked',
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
