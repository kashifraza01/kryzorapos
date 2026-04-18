<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove all licensing-related database artifacts.
     * - Drops the licenses table
     * - Removes plan and subscription_expires_at columns from users table
     * - Removes license-related settings (license_key, license_expiry, etc.)
     */
    public function up(): void
    {
        // Drop licenses table if it exists
        if (Schema::hasTable('licenses')) {
            Schema::drop('licenses');
        }

        // Remove licensing columns from users table
        if (Schema::hasTable('users')) {
            if (Schema::hasColumn('users', 'plan')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropColumn('plan');
                });
            }
            if (Schema::hasColumn('users', 'subscription_expires_at')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropColumn('subscription_expires_at');
                });
            }
        }

        // Remove license-related settings
        if (Schema::hasTable('settings')) {
            \App\Models\Setting::whereIn('key', [
                'license_key',
                'license_expiry',
                'license_plan',
                'license_activated_at',
                'license_machine_id',
                'license_signature',
            ])->delete();
        }
    }

    public function down(): void
    {
        // No rollback needed — licensing is gone for good
    }
};
