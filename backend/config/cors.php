<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for cross-origin resource sharing. In production, only the
    | frontend domain is allowed. For local Electron, set FRONTEND_URL=*
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [env('FRONTEND_URL', '*'), 'https://kryzorapos.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:8111'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
