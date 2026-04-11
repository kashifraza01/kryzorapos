<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration 
{
    public function up(): void
    {
        // Enhance Settings table
        Schema::table('settings', function (Blueprint $table) {
            $table->string('key')->unique()->after('id');
            $table->text('value')->nullable()->after('key');
        });

        // Enhance Orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->text('delivery_address')->nullable()->after('order_type');
        });
    }

    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn(['key', 'value']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivery_address');
        });
    }
};
