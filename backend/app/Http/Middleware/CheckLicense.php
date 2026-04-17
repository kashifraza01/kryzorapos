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
     * Licensing system removed — all features are unlocked.
     * This middleware now simply passes all requests through.
     */
    public function handle(Request $request, Closure $next, $feature = null): Response
    {
        return $next($request);
    }
}
