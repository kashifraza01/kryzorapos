<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration 
{
    public function up(): void
    {
        Schema::create('sales_reports', function (Blueprint $table) {
            $table->id();
            $table->date('report_date');
            $table->integer('total_orders');
            $table->decimal('total_revenue', 15, 2);
            $table->decimal('total_profit', 15, 2);
            $table->json('data')->nullable(); // detailed breakdown
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_reports');
    }
};
