<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for cross-origin resource sharing. In production, the
    | FRONTEND_URL environment variable controls allowed origins.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => function () {
        $origins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ];
        
        // Add FRONTEND_URL from environment (supports Vercel, etc)
        $frontendUrl = env('FRONTEND_URL');
        if ($frontendUrl && $frontendUrl !== '*') {
            // Remove trailing slash and add both http/https versions
            $origins[] = rtrim($frontendUrl, '/');
            $origins[] = str_replace('https://', 'http://', rtrim($frontendUrl, '/'));
        }
        
        return $origins;
    },

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
