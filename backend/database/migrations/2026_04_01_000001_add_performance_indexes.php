<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Orders: frequently queried by date, status, payment_status, user, table
        Schema::table('orders', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('payment_status');
            $table->index('status');
            $table->index(['payment_status', 'created_at']);
        });

        // Payments: queried by order, method, date
        Schema::table('payments', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('payment_method');
            $table->index('status');
        });

        // Order items: queried for reports by menu_item_id
        Schema::table('order_items', function (Blueprint $table) {
            $table->index('menu_item_id');
        });

        // Expenses: queried by date, category
        Schema::table('expenses', function (Blueprint $table) {
            $table->index('expense_date');
            $table->index('category');
        });

        // Inventory: low stock alerts query
        Schema::table('inventory', function (Blueprint $table) {
            $table->index(['quantity', 'low_stock_threshold']);
        });

        // Shifts: queried by user + status
        Schema::table('shifts', function (Blueprint $table) {
            $table->index(['user_id', 'status']);
            $table->index('opened_at');
        });

        // Settings: queried by key
        Schema::table('settings', function (Blueprint $table) {
            $table->index('key');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['payment_status']);
            $table->dropIndex(['status']);
            $table->dropIndex(['payment_status', 'created_at']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['payment_method']);
            $table->dropIndex(['status']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['menu_item_id']);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropIndex(['expense_date']);
            $table->dropIndex(['category']);
        });

        Schema::table('inventory', function (Blueprint $table) {
            $table->dropIndex(['quantity', 'low_stock_threshold']);
        });

        Schema::table('shifts', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['opened_at']);
        });

        Schema::table('settings', function (Blueprint $table) {
            $table->dropIndex(['key']);
        });
    }
};
