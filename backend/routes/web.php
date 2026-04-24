<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Health check endpoint for Railway and other platforms
Route::get('/up', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()]);
});
