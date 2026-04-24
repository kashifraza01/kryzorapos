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
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function fresh()
    {
        try {
            Artisan::call('migrate:fresh', ['--seed' => true, '--seeder' => 'Database\Seeders\DatabaseDemoSeeder']);
            return response()->json(['message' => 'Database reset with sample data!']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}