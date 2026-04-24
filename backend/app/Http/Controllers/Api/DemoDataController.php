<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Artisan;

class DemoDataController extends Controller
{
    public function seed()
    {
        try {
            // First ensure base structure (roles, permissions, admin account)
            Artisan::call('db:seed', ['--class' => 'Database\Seeders\KryzoraPOSSeeder']);
            // Then seed demo data
            Artisan::call('db:seed', ['--class' => 'Database\Seeders\DatabaseDemoSeeder']);
            return response()->json(['message' => 'Sample data seeded successfully!']);
        } catch (\Exception $e) {
            \Log::error('DemoData seed error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }

    public function fresh()
    {
        try {
            Artisan::call('migrate:fresh', ['--seed' => true, '--seeder' => 'Database\Seeders\DatabaseDemoSeeder']);
            return response()->json(['message' => 'Database reset with sample data!']);
        } catch (\Exception $e) {
            \Log::error('DemoData fresh error: ' . $e->getMessage());
            return response()->json(['error' => 'Server Error'], 500);
        }
    }
}