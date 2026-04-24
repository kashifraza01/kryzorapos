<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Setting;

class KryzoraPOSSeeder extends Seeder
{
    public function run()
    {
        // 1. Seed restaurant settings safely (firstOrCreate = never overwrites existing values)
        $settings = [
            'restaurant_name' => "KryzoraPOS",
            'restaurant_address' => 'Your Restaurant Address',
            'restaurant_phone' => '0300-0000000',
            'currency' => 'Rs.',
            'tax_rate' => '0',
            'service_charge' => '0',
            'delivery_charge' => '0',
            'footer_text' => 'Thank You! Visit Again!',
            'fbr_enabled' => '0',
            'fbr_pos_id' => '',
            'jazzcash_no' => '0000-0000000',
            'easypaisa_no' => '0000-0000000',
        ];

        foreach ($settings as $key => $value) {
            Setting::firstOrCreate(['key' => $key], ['value' => $value]);
        }

        // 2. Setup Roles
        $adminRole = \App\Models\Role::firstOrCreate(['id' => 1], ['name' => 'Administrator', 'slug' => 'admin']);
        $managerRole = \App\Models\Role::firstOrCreate(['id' => 2], ['name' => 'Manager', 'slug' => 'manager']);
        $cashierRole = \App\Models\Role::firstOrCreate(['id' => 3], ['name' => 'Cashier', 'slug' => 'cashier']);
        $waiterRole = \App\Models\Role::firstOrCreate(['id' => 4], ['name' => 'Waiter', 'slug' => 'waiter']);

        // Give all permissions to admin (basic version)
        $perms = ['manage-menu', 'take-orders', 'view-reports', 'manage-staff', 'manage-inventory'];
        foreach ($perms as $p) {
            $perm = \App\Models\Permission::firstOrCreate(['slug' => $p], ['name' => ucwords(str_replace('-', ' ', $p))]);
            $adminRole->permissions()->syncWithoutDetaching([$perm->id]);
            if (in_array($p, ['take-orders'])) {
                $cashierRole->permissions()->syncWithoutDetaching([$perm->id]);
            }
        }

        // 3. Setup Default Admin Account — admin@kryzorapos.com / admin123
        // updateOrCreate ensures password is always reset on deploy
        User::updateOrCreate(
            ['email' => 'admin@kryzorapos.com'],
            [
                'name' => 'Admin',
                'password' => bcrypt('admin123'),
                'role_id' => $adminRole->id,
            ]
        );

        $this->command->info('KryzoraPOS Core Structure (Roles, Permissions, Settings, Admin) Seeded Successfully!');

    }
}
