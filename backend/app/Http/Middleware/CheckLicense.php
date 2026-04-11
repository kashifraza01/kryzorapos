<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckLicense
{
    /**
     * Handle an incoming request.
     *
     * In CLOUD mode (DB_CONNECTION != sqlite): delegates to CheckSubscription.
     * In OFFLINE mode (DB_CONNECTION == sqlite): uses LicenseService (HMAC).
     *
     * Usage in routes: ->middleware('license:inventory')
     */
    public function handle(Request $request, Closure $next, $feature = null): Response
    {
        // Cloud mode — use subscription-based access control
        if (config('database.default') !== 'sqlite') {
            return app(CheckSubscription::class)->handle($request, $next, $feature);
        }

        // Offline mode — use HMAC license system
        $license = \App\Services\LicenseService::check();

        // If license is not valid at all, block access
        if (!$license['valid']) {
            return response()->json([
                'message' => $license['message'] ?? 'License expired or not activated.',
                'license_status' => $license['status'],
                'requires_activation' => true,
            ], 403);
        }

        // If a specific feature is required, check plan features
        if ($feature && !in_array($feature, $license['features'] ?? [])) {
            $planName = \App\Services\LicenseService::PLANS[$license['plan']]['name'] ?? $license['plan'];
            return response()->json([
                'message' => "This feature requires a higher plan. Your current plan: {$planName}",
                'license_status' => 'feature_locked',
                'current_plan' => $license['plan'],
                'required_feature' => $feature,
            ], 403);
        }

        return $next($request);
    }
}
