<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\SubscriptionService;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     * For CLOUD mode: bypass all subscription checks - free access!
     * For OFFLINE mode: check subscription normally.
     */
    public function handle(Request $request, Closure $next, $feature = null): Response
    {
        // CLOUD MODE: Skip ALL subscription checks - full access!
        // This allows free usage of the POS system in cloud
        $isCloud = config('database.default') !== 'sqlite';
        
        if ($isCloud) {
            // Cloud mode: allow everything, no restrictions
            return $next($request);
        }

        // OFFLINE MODE: Normal subscription check
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $subscription = SubscriptionService::check($user);

        // If subscription is not valid, block access
        if (!$subscription['valid']) {
            return response()->json([
                'message' => $subscription['message'] ?? 'Subscription expired or not active.',
                'license_status' => $subscription['status'],
                'requires_subscription' => true,
                'requires_activation' => true,
            ], 403);
        }

        // If a specific feature is required, check plan features
        if ($feature && !in_array($feature, $subscription['features'] ?? [])) {
            $planName = SubscriptionService::PLANS[$subscription['plan']]['name'] ?? $subscription['plan'];
            return response()->json([
                'message' => "This feature requires a higher plan. Your current plan: {$planName}",
                'license_status' => 'feature_locked',
                'current_plan' => $subscription['plan'],
                'required_feature' => $feature,
            ], 403);
        }

        return $next($request);
    }
}
