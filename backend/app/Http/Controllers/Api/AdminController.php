<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Manually assign a subscription plan to a user.
     * Licensing removed — this sets user plan fields directly.
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
        $user->update([
            'plan' => $validated['plan'],
            'subscription_expires_at' => now()->addDays($validated['duration_days']),
        ]);

        return response()->json([
            'message' => "Plan '{$validated['plan']}' assigned to {$user->name} for {$validated['duration_days']} days.",
        ]);
    }
}
