<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json($settings);
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
        // Cache public settings for 5 minutes (they rarely change)
        $settings = Cache::remember('public_settings', 300, function () {
            $keys = [
                'restaurant_name', 'restaurant_address', 'restaurant_phone', 
                'currency', 'footer_text', 'tax_rate', 'service_charge',
                'jazzcash_no', 'easypaisa_no', 'fbr_enabled', 'fbr_pos_id', 'delivery_charge'
            ];
            return Setting::whereIn('key', $keys)->get()->pluck('value', 'key');
        });

        return response()->json($settings);
    }
}
