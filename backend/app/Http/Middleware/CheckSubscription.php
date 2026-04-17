<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     *
     * Subscription system removed — all features are unlocked.
     * This middleware now simply passes all requests through.
     */
    public function handle(Request $request, Closure $next, $feature = null): Response
    {
        return $next($request);
    }
}
