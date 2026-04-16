<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\POSController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\KitchenController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\PublicMenuController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\AdminController;

// ============================================================
// PUBLIC ROUTES (No auth, no license required)
// ============================================================

// Login — rate limited to 10 attempts per minute per IP
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// License routes — NO throttle (local desktop app, must always respond)
Route::prefix('auth')->group(function () {
    Route::get('/license/check', [AuthController::class, 'checkLicense']);
    Route::post('/license/verify', [AuthController::class, 'verifyLicense']);
    Route::post('/license/activate', [AuthController::class, 'activateLicense']);
});

Route::get('/settings/public', [SettingController::class, 'getPublicSettings']);
Route::get('/public-menu', [PublicMenuController::class, 'getMenu']);
Route::post('/public-menu/order', [PublicMenuController::class, 'placeOrder'])->middleware('throttle:30,1');
Route::get('/kitchen/stream', [KitchenController::class, 'stream']);

// ============================================================
// AUTHENTICATED ROUTES (All require login + valid license)
// ============================================================

Route::middleware(['auth:sanctum', 'license'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', fn(Request $request) => $request->user()->load('role.permissions'));

    // System Operations
    Route::get('/system/backup', [BackupController::class, 'download']);

    // -------------------------------------------------------
    // SALES PLAN FEATURES (pos, tables, customers, orders)
    // -------------------------------------------------------

    // Menu read (available to all plans)
    Route::get('/menu/categories', [MenuController::class, 'categories']);
    Route::get('/menu/categories/{categoryId}/items', [MenuController::class, 'itemsByCategory']);
    Route::get('/menu/all', [MenuController::class, 'index']);
    Route::get('/menu/items/{id}/ingredients', [MenuController::class, 'getIngredients']);

    // POS & Orders
    Route::middleware('license:pos')->group(function () {
        Route::get('/tables', [POSController::class, 'listTables']);
        Route::post('/tables', [POSController::class, 'storeTable']);
        Route::put('/tables/{id}/position', [POSController::class, 'updateTablePosition']);
        Route::get('/orders', [POSController::class, 'indexOrders']);
        Route::post('/orders', [POSController::class, 'storeOrder']);
        Route::get('/orders/{id}', [POSController::class, 'showOrder']);
        Route::post('/orders/{orderId}/pay', [POSController::class, 'processPayment']);
        Route::post('/orders/{orderId}/refund', [POSController::class, 'refundItem']);
    });

    // Customers & Riders
    Route::middleware('license:pos')->group(function () {
        Route::get('/customers/search', [CustomerController::class, 'search']);
        Route::apiResource('customers', CustomerController::class);
        Route::apiResource('riders', \App\Http\Controllers\Api\RiderController::class);
    });

    // -------------------------------------------------------
    // SALES + INVENTORY PLAN FEATURES
    // -------------------------------------------------------

    // Menu Management (write)
    Route::middleware(['can:manage-menu', 'license:menu-setup'])->group(function () {
        Route::post('/menu/categories', [MenuController::class, 'storeCategory']);
        Route::put('/menu/categories/{id}', [MenuController::class, 'updateCategory']);
        Route::delete('/menu/categories/{id}', [MenuController::class, 'destroyCategory']);
        Route::post('/menu/items', [MenuController::class, 'storeItem']);
        Route::put('/menu/items/{id}', [MenuController::class, 'updateItem']);
        Route::delete('/menu/items/{id}', [MenuController::class, 'destroyItem']);
        Route::post('/menu/items/{id}/ingredients', [MenuController::class, 'updateIngredients']);
    });

    // Kitchen
    Route::middleware('license:kitchen')->group(function () {
        Route::get('/kitchen/orders', [KitchenController::class, 'index']);
        Route::post('/kitchen/orders/{id}/status', [KitchenController::class, 'updateStatus']);
    });
    Route::get('/test', function () {
        return response()->json(["msg" => "API OK"]);
    });

    // Inventory
    Route::middleware('license:inventory')->group(function () {
        Route::get('/inventory/alerts', [InventoryController::class, 'lowStockAlerts']);
        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::middleware('can:manage-inventory')->group(function () {
            Route::post('/inventory', [InventoryController::class, 'store']);
            Route::delete('/inventory/{id}', [InventoryController::class, 'destroy']);
            Route::post('/inventory/{id}/stock', [InventoryController::class, 'updateStock']);
        });
    });

    // Suppliers & Purchases
    Route::middleware('license:suppliers')->group(function () {
        Route::apiResource('suppliers', SupplierController::class);
    });
    Route::middleware('license:purchases')->group(function () {
        Route::apiResource('purchases', PurchaseController::class);
    });

    // -------------------------------------------------------
    // FULL PLAN FEATURES
    // -------------------------------------------------------

    // Reports & Order History (full plan)
    Route::middleware('license:reports')->group(function () {
        Route::get('/reports/daily-summary', [ReportController::class, 'dailySummary']);
        Route::get('/reports/weekly-sales', [ReportController::class, 'weeklySales']);
        Route::get('/reports/recent-orders', [ReportController::class, 'recentOrders']);
        Route::get('/reports/top-items', [ReportController::class, 'topSellingItems']);
        Route::get('/reports/export-csv', [ReportController::class, 'exportSalesCsv']);
    });

    // Staff
    Route::middleware('license:staff')->group(function () {
        Route::get('/staff', [StaffController::class, 'index']);
        Route::get('/roles', fn() => response()->json(\App\Models\Role::all()));
        Route::middleware('can:manage-staff')->group(function () {
            Route::post('/staff', [StaffController::class, 'store']);
            Route::put('/staff/{staff}', [StaffController::class, 'update']);
            Route::delete('/staff/{staff}', [StaffController::class, 'destroy']);
        });
    });

    // Attendance
    Route::middleware('license:attendance')->group(function () {
        Route::get('/attendance/status', [AttendanceController::class, 'status']);
        Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn']);
        Route::post('/attendance/clock-out', [AttendanceController::class, 'clockOut']);
        Route::get('/attendance/history', [AttendanceController::class, 'index']);
    });

    // Expenses
    Route::middleware('license:expenses')->group(function () {
        Route::get('/expenses/summary', [ExpenseController::class, 'monthlySummary']);
        Route::apiResource('expenses', ExpenseController::class);
    });

    // Settings (Full plan only)
    Route::middleware('license:settings')->group(function () {
        Route::get('/settings', [SettingController::class, 'index']);
        Route::post('/settings', [SettingController::class, 'updateAll']);
    });

    // Shift Management (part of POS feature)
    Route::middleware('license:pos')->group(function () {
        Route::get('/shifts', [ShiftController::class, 'index']);
        Route::get('/shifts/current', [ShiftController::class, 'current']);
        Route::post('/shifts/open', [ShiftController::class, 'open']);
        Route::post('/shifts/close', [ShiftController::class, 'close']);
    });

    // Daily Closing Report (full plan)
    Route::middleware('license:reports')->group(function () {
        Route::get('/reports/daily-closing', [ShiftController::class, 'dailyReport']);
    });

    // Admin — Subscription Management (cloud only)
    Route::middleware('can:manage-staff')->group(function () {
        Route::post('/admin/set-plan', [AdminController::class, 'setPlan']);
    });
});
