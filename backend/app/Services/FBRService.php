<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class FBRService
{
    public static function generateFBRInvoice($order)
    {
        $fbrEnabled = Setting::where('key', 'fbr_enabled')->value('value') == '1';
        $fbrPosID = Setting::where('key', 'fbr_pos_id')->value('value');

        if (!$fbrEnabled || empty($fbrPosID)) {
            return null; // FBR is not enabled or POS ID is missing
        }

        // Mock FBR API integration
        try {
            // Usually, FBR requires calculating correct tax and sending it to their endpoint.
            // In a real scenario:
            /*
            $response = Http::withHeaders([
                'Authorization' => "Bearer YOUR_FBR_TOKEN"
            ])->post('https://fbr.gov.pk/api/PostReceipt', [
                'POSID' => $fbrPosID,
                'USIN' => $order->id,
                'RefUSIN' => null,
                'DateTime' => now()->format('Y-m-d H:i:s'),
                'TotalAmount' => $order->total_amount,
                'TotalTax' => $order->tax_amount,
                // Items...
            ]);
            */

            // Since this is local POS, we simulate the FBR response and generate a random dummy PCTcode
            $pctCode = "FBR-" . $fbrPosID . "-" . strtoupper(substr(uniqid(), -6));
            
            // Save to DB
            $order->update(['fbr_invoice_number' => $pctCode]);
            
            return $pctCode;
        } catch (\Exception $e) {
            Log::error("FBR Integration Error: " . $e->getMessage());
            return null;
        }
    }
}
