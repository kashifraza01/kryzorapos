<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'rider_id')) {
                $table->unsignedBigInteger('rider_id')->nullable()->after('waiter_id');

                // Only add FK if riders table exists
                if (Schema::hasTable('riders')) {
                    $table->foreign('rider_id')->references('id')->on('riders')->nullOnDelete();
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'rider_id')) {
                // Drop FK first if it exists
                try {
                    $table->dropForeign(['rider_id']);
                } catch (\Exception $e) {
                    // FK may not exist
                }
                $table->dropColumn('rider_id');
            }
        });
    }
};
