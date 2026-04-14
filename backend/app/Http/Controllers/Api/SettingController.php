<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class SettingController extends Controller
{
    /**
     * Default settings returned when the database is empty or table doesn't exist.
     * Prevents 500 errors on fresh deploys before migrations run.
     */
    private static function getDefaultSettings(): array
    {
        return [
            'restaurant_name' => 'KryzoraPOS',
            'restaurant_address' => '',
            'restaurant_phone' => '',
            'currency' => 'Rs.',
            'footer_text' => 'Thank You! Visit Again!',
            'tax_rate' => '0',
            'service_charge' => '0',
            'jazzcash_no' => '',
            'easypaisa_no' => '',
            'fbr_enabled' => '0',
            'fbr_pos_id' => '',
            'delivery_charge' => '0',
        ];
    }

    public function index()
    {
        try {
            $settings = Setting::all()->pluck('value', 'key');
            return response()->json($settings);
        } catch (\Exception $e) {
            return response()->json(self::getDefaultSettings());
        }
    }

    public function updateAll(Request $request)
    {
        $validated = $request->validate([
            'restaurant_name'   => 'nullable|string|max:100',
            'restaurant_phone'  => 'nullable|string|max:50',
            'restaurant_address'=> 'nullable|string|max:255',
            'tax_rate'          => 'nullable|numeric|min:0|max:100',
            'service_charge'    => 'nullable|numeric|min:0|max:100',
            'currency'          => 'nullable|string|max:10',
            'footer_text'       => 'nullable|string|max:500',
            'jazzcash_no'       => 'nullable|string|max:50',
            'easypaisa_no'      => 'nullable|string|max:50',
            'fbr_enabled'       => 'nullable|boolean',
            'fbr_pos_id'        => 'nullable|string|max:50',
            'delivery_charge'   => 'nullable|numeric|min:0',
            'receipt_header'    => 'nullable|string|max:500',
            'receipt_footer'    => 'nullable|string|max:500',
        ]);

        foreach ($validated as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value ?? '']);
        }

        // Clear settings cache when updated
        Cache::forget('public_settings');

        return response()->json(['message' => 'Settings saved successfully']);
    }

    public function getPublicSettings()
    {
        try {
            // Cache public settings for 5 minutes (they rarely change)
            $settings = Cache::remember('public_settings', 300, function () {
                $keys = [
                    'restaurant_name', 'restaurant_address', 'restaurant_phone',
                    'currency', 'footer_text', 'tax_rate', 'service_charge',
                    'jazzcash_no', 'easypaisa_no', 'fbr_enabled', 'fbr_pos_id', 'delivery_charge'
                ];

                // Safety check: if settings table doesn't exist yet, return defaults
                if (!Schema::hasTable('settings')) {
                    return collect(self::getDefaultSettings());
                }

                $dbSettings = Setting::whereIn('key', $keys)->get()->pluck('value', 'key');

                // Merge with defaults so missing keys always have a value
                return collect(self::getDefaultSettings())->merge($dbSettings);
            });

            return response()->json($settings);
        } catch (\Exception $e) {
            // Absolute fallback — never return 500
            return response()->json(self::getDefaultSettings());
        }
    }
}
