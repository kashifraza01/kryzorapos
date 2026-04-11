<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Manually assign a subscription plan to a user.
     *
     * POST /api/admin/set-plan
     * { user_id, plan, duration_days }
     */
    public function setPlan(Request $request)
    {
        $validated = $request->validate([
            'user_id'       => 'required|exists:users,id',
            'plan'          => 'required|string|in:sales,sales_inventory,full',
            'duration_days' => 'required|integer|min:1|max:3650',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $result = SubscriptionService::setPlan($user, $validated['plan'], $validated['duration_days']);

        return response()->json([
            'message'      => "Plan '{$result['plan']}' assigned to {$user->name} for {$validated['duration_days']} days.",
            'subscription' => $result,
        ]);
    }
}
