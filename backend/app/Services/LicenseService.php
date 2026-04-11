<?php

namespace App\Services;

use App\Models\Setting;
use Carbon\Carbon;

class LicenseService
{
    // License plans and their allowed features
    const PLANS = [
        'sales' => [
            'name' => 'Sales',
            'price' => 2000,
            'features' => [
                'pos', 'tables', 'customers', 'orders',
                'receipts', 'whatsapp', 'public-menu', 'order-history'
            ],
        ],
        'sales_inventory' => [
            'name' => 'Sales + Inventory',
            'price' => 4000,
            'features' => [
                'pos', 'tables', 'customers', 'orders',
                'receipts', 'whatsapp', 'public-menu', 'order-history',
                'inventory', 'suppliers', 'purchases', 'kitchen', 'menu-setup'
            ],
        ],
        'full' => [
            'name' => 'Full Suite',
            'price' => 6500,
            'features' => [
                'pos', 'tables', 'customers', 'orders',
                'receipts', 'whatsapp', 'public-menu', 'order-history',
                'inventory', 'suppliers', 'purchases', 'kitchen', 'menu-setup',
                'reports', 'staff', 'attendance', 'expenses', 'settings', 'dashboard-full'
            ],
        ],
    ];

    // Master keys removed. We now use HMAC signed activation keys.

    const GRACE_PERIOD_DAYS = 3;

    /**
     * Get the signing secret — APP_KEY combined with machine fingerprint.
     * This ensures that even if APP_KEY is known, each machine has a unique signing key.
     */
    private static function getSigningSecret()
    {
        return config('app.key') . '|' . self::getMachineId();
    }

    /**
     * Check if the local license is valid and return its status.
     */
    public static function check()
    {
        $licenseKey  = Setting::where('key', 'license_key')->value('value');
        $expiry      = Setting::where('key', 'license_expiry')->value('value');
        $plan        = Setting::where('key', 'license_plan')->value('value') ?? 'sales';
        $activatedAt = Setting::where('key', 'license_activated_at')->value('value');

        // No license key at all => trial / inactive
        if (empty($licenseKey)) {
            return [
                'status'   => 'inactive',
                'valid'    => false,
                'plan'     => null,
                'features' => [],
                'message'  => 'No license activated. Please enter your license key.',
            ];
        }

        // Validate HMAC signature to prevent SQLite tampering
        $signature = Setting::where('key', 'license_signature')->value('value');
        $expectedSignature = hash_hmac('sha256', $licenseKey . $expiry . $plan, self::getSigningSecret());

        if (!$signature || !hash_equals($expectedSignature, $signature)) {
            return [
                'status'   => 'tampered',
                'valid'    => false,
                'plan'     => null,
                'features' => [],
                'message'  => 'License data has been tampered with. System locked.',
            ];
        }

        // Verify machine binding — detect if DB was copied from another machine
        $storedMachineId = Setting::where('key', 'license_machine_id')->value('value');
        if ($storedMachineId && $storedMachineId !== self::getMachineId()) {
            return [
                'status'   => 'invalid_machine',
                'valid'    => false,
                'plan'     => null,
                'features' => [],
                'message'  => 'License is bound to a different machine. Please contact support.',
            ];
        }

        // Check expiry
        if ($expiry) {
            $expiryDate = Carbon::parse($expiry);

            if ($expiryDate->isPast()) {
                // Check grace period
                $daysPastExpiry = $expiryDate->diffInDays(now());

                if ($daysPastExpiry <= self::GRACE_PERIOD_DAYS) {
                    $daysLeft = self::GRACE_PERIOD_DAYS - $daysPastExpiry;
                    return [
                        'status'   => 'grace',
                        'valid'    => true,
                        'plan'     => $plan,
                        'features' => self::getFeaturesForPlan($plan),
                        'expiry'   => $expiry,
                        'message'  => "License expired! {$daysLeft} day(s) grace period remaining. Renew now.",
                    ];
                }

                return [
                    'status'   => 'expired',
                    'valid'    => false,
                    'plan'     => $plan,
                    'features' => [],
                    'expiry'   => $expiry,
                    'message'  => 'License expired. Please renew to continue.',
                ];
            }

            $daysLeft = now()->diffInDays($expiryDate);
            return [
                'status'    => 'active',
                'valid'     => true,
                'plan'      => $plan,
                'features'  => self::getFeaturesForPlan($plan),
                'expiry'    => $expiry,
                'days_left' => $daysLeft,
                'message'   => 'License active',
            ];
        }

        // Has key but no expiry somehow — treat as active lifetime
        return [
            'status'   => 'active',
            'valid'    => true,
            'plan'     => $plan,
            'features' => self::getFeaturesForPlan($plan),
            'expiry'   => null,
            'message'  => 'License active (lifetime)',
        ];
    }

    public static function activate($key)
    {
        $key = strtoupper(trim($key));

        // Format expected: KRZ-{PLAN}-{MONTHS}-{SIGNATURE}
        $parts = explode('-', $key);
        if (count($parts) === 4 && $parts[0] === 'KRZ') {
            $plan = strtolower($parts[1]);
            if (!isset(self::PLANS[$plan])) {
                 return ['success' => false, 'message' => 'Invalid plan inside key.'];
            }
            $months = (int)$parts[2];
            $providedSignature = $parts[3];
            
            // Key signature uses APP_KEY only (generated server-side), not machine-bound
            $textToSign = "KRZ-{$plan}-{$months}";
            $validSignature = substr(hash_hmac('sha256', $textToSign, config('app.key')), 0, 8);
            
            if (strtoupper($providedSignature) === strtoupper($validSignature)) {
                $expiry = now()->addMonths($months);
                self::storeLicense($key, $plan, $expiry);

                return [
                    'success' => true,
                    'plan'    => $plan,
                    'expiry'  => $expiry->toDateTimeString(),
                    'message' => 'License activated successfully! Plan: ' . self::PLANS[$plan]['name'],
                ];
            }
        }

        return [
            'success' => false,
            'message' => 'Invalid license key. Signature mismatch or bad format.',
        ];
    }

    /**
     * Store license data in settings.
     * The stored HMAC signature uses the machine-bound signing secret,
     * so copying the database to another machine will invalidate the license.
     */
    private static function storeLicense($key, $plan, $expiry)
    {
        $expiryStr = $expiry ? $expiry->toDateTimeString() : null;
        Setting::updateOrCreate(['key' => 'license_key'], ['value' => $key]);
        Setting::updateOrCreate(['key' => 'license_plan'], ['value' => $plan]);
        Setting::updateOrCreate(['key' => 'license_expiry'], ['value' => $expiryStr]);
        Setting::updateOrCreate(['key' => 'license_activated_at'], ['value' => now()->toDateTimeString()]);
        Setting::updateOrCreate(['key' => 'license_machine_id'], ['value' => self::getMachineId()]);
        
        // Sign with machine-bound secret so DB copies are detected
        $dataToSign = $key . $expiryStr . $plan;
        $signature = hash_hmac('sha256', $dataToSign, self::getSigningSecret());
        Setting::updateOrCreate(['key' => 'license_signature'], ['value' => $signature]);
    }

    /**
     * Get allowed feature slugs for a plan.
     */
    public static function getFeaturesForPlan($plan)
    {
        return self::PLANS[$plan]['features'] ?? [];
    }

    /**
     * Check if a specific feature is allowed under the current license.
     */
    public static function hasFeature($featureSlug)
    {
        $license = self::check();
        if (!$license['valid']) return false;
        return in_array($featureSlug, $license['features'] ?? []);
    }

    /**
     * Get all plan info for display on activation screen.
     */
    public static function getPlans()
    {
        $plans = [];
        foreach (self::PLANS as $slug => $plan) {
            $plans[] = [
                'slug'     => $slug,
                'name'     => $plan['name'],
                'price'    => $plan['price'],
                'features' => $plan['features'],
            ];
        }
        return $plans;
    }

    /**
     * Generate a simple machine fingerprint for license binding.
     */
    public static function getMachineId()
    {
        $hostname = gethostname();
        $dir = base_path();
        return hash('sha256', $hostname . '|' . $dir);
    }
}
