<?php

namespace App\Services;

use App\Models\User;

class SubscriptionService
{
    /**
     * Plan definitions — mirrors LicenseService::PLANS for consistency.
     * Same feature slugs, same plan structure.
     */
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

    /**
     * Check subscription status for a user.
     */
    public static function check(User $user)
    {
        $plan = $user->plan;
        $expiresAt = $user->subscription_expires_at;

        if (empty($plan) || !isset(self::PLANS[$plan])) {
            return [
                'status'   => 'inactive',
                'valid'    => false,
                'plan'     => null,
                'features' => [],
                'message'  => 'No active subscription.',
            ];
        }

        if ($expiresAt && $expiresAt->isPast()) {
            return [
                'status'   => 'expired',
                'valid'    => false,
                'plan'     => $plan,
                'features' => [],
                'expiry'   => $expiresAt->toDateTimeString(),
                'message'  => 'Subscription expired. Please renew.',
            ];
        }

        $daysLeft = $expiresAt ? now()->diffInDays($expiresAt) : null;

        return [
            'status'    => 'active',
            'valid'     => true,
            'plan'      => $plan,
            'features'  => self::PLANS[$plan]['features'],
            'expiry'    => $expiresAt ? $expiresAt->toDateTimeString() : null,
            'days_left' => $daysLeft,
            'message'   => 'Subscription active',
        ];
    }

    /**
     * Get features for a plan slug.
     */
    public static function getFeaturesForPlan($plan)
    {
        return self::PLANS[$plan]['features'] ?? [];
    }

    /**
     * Get all plans for display.
     */
    public static function getPlans()
    {
        $plans = [];
        foreach (self::PLANS as $slug => $plan) {
            $plans[] = [
                'slug'     => $slug,
                'name'     => $plan['name'],
                'price'    => $plan['price'] ?? 0,
                'features' => $plan['features'],
            ];
        }
        return $plans;
    }

    /**
     * Assign a plan to a user.
     */
    public static function setPlan(User $user, string $plan, int $durationDays)
    {
        $user->update([
            'plan' => $plan,
            'subscription_expires_at' => now()->addDays($durationDays),
        ]);

        return self::check($user->fresh());
    }
}
