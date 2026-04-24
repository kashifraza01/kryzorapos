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
use App\Http\Controllers\Api\DemoDataController;

// ============================================================
// PUBLIC ROUTES (No auth required)
// ============================================================

// Login — rate limited to 10 attempts per minute per IP
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// System health check
Route::get('/test', fn() => response()->json(['msg' => 'API OK']));

// TEMPORARY: Force reset admin password (remove after login works)
Route::get('/fix-admin', function () {
    $user = \App\Models\User::where('email', 'admin@kryzorapos.com')->first();
    if ($user) {
        $user->password = 'admin123';
        $user->save();
        return response()->json(['status' => 'Admin password reset', 'user_id' => $user->id]);
    }
    // If admin doesn't exist, run seeder
    \Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'Database\\Seeders\\KryzoraPOSSeeder', '--force' => true]);
    return response()->json(['status' => 'Seeder ran - admin created']);
});

// Public endpoints — rate limited
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/settings/public', [SettingController::class, 'getPublicSettings']);
    Route::get('/public-menu', [PublicMenuController::class, 'getMenu']);
    Route::post('/public-menu/order', [PublicMenuController::class, 'placeOrder'])->middleware('throttle:30,1');
    Route::get('/kitchen/stream', [KitchenController::class, 'stream']);
});

// ============================================================
// AUTHENTICATED ROUTES (All require login)
// ============================================================

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', fn(Request $request) => $request->user()->load('role.permissions'));

    // System Operations
    Route::get('/system/backup', [BackupController::class, 'download']);

    // Demo Data (Admin only)
    Route::middleware('can:manage-staff')->group(function () {
        Route::post('/system/demo/seed', [DemoDataController::class, 'seed']);
        Route::post('/system/demo/fresh', [DemoDataController::class, 'fresh']);
    });

    // -------------------------------------------------------
    // MENU (Read for all, Write for authorized)
    // -------------------------------------------------------

    // Menu read (available to all authenticated users)
    Route::get('/menu/categories', [MenuController::class, 'categories']);
    Route::get('/menu/categories/{categoryId}/items', [MenuController::class, 'itemsByCategory']);
    Route::get('/menu/all', [MenuController::class, 'index']);
    Route::get('/menu/items/{id}/ingredients', [MenuController::class, 'getIngredients']);

    // Menu Management (write) — requires can:manage-menu permission
    Route::middleware('can:manage-menu')->group(function () {
        Route::post('/menu/categories', [MenuController::class, 'storeCategory']);
        Route::put('/menu/categories/{id}', [MenuController::class, 'updateCategory']);
        Route::delete('/menu/categories/{id}', [MenuController::class, 'destroyCategory']);
        Route::post('/menu/items', [MenuController::class, 'storeItem']);
        Route::put('/menu/items/{id}', [MenuController::class, 'updateItem']);
        Route::delete('/menu/items/{id}', [MenuController::class, 'destroyItem']);
        Route::post('/menu/items/{id}/ingredients', [MenuController::class, 'updateIngredients']);
    });

    // -------------------------------------------------------
    // POS & ORDERS (Core sales features)
    // -------------------------------------------------------

    // Tables (Floor plan)
    Route::get('/tables', [POSController::class, 'listTables']);
    Route::post('/tables', [POSController::class, 'storeTable']);
    Route::put('/tables/{id}/position', [POSController::class, 'updateTablePosition']);

    // Orders & Payments
    Route::post('/orders', [POSController::class, 'storeOrder']);
    Route::post('/orders/{orderId}/pay', [POSController::class, 'processPayment']);
    Route::post('/orders/{orderId}/refund', [POSController::class, 'refundItem']);

    // Customers & Riders
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('riders', \App\Http\Controllers\Api\RiderController::class);

    // -------------------------------------------------------
    // INVENTORY & SUPPLIERS (Sales+Inventory features)
    // -------------------------------------------------------

    // Inventory (requires can:manage-inventory permission for write operations)
    Route::get('/inventory/alerts', [InventoryController::class, 'lowStockAlerts']);
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::middleware('can:manage-inventory')->group(function () {
        Route::post('/inventory', [InventoryController::class, 'store']);
        Route::delete('/inventory/{id}', [InventoryController::class, 'destroy']);
        Route::post('/inventory/{id}/stock', [InventoryController::class, 'updateStock']);
    });

    // Suppliers & Purchases
    Route::apiResource('suppliers', SupplierController::class)->middleware('can:manage-inventory');
    Route::apiResource('purchases', PurchaseController::class)->middleware('can:manage-inventory');

    // -------------------------------------------------------
    // KITCHEN
    // -------------------------------------------------------

    Route::get('/kitchen/orders', [KitchenController::class, 'index']);
    Route::post('/kitchen/orders/{id}/status', [KitchenController::class, 'updateStatus']);

    // -------------------------------------------------------
    // REPORTS & ANALYTICS (Full plan features)
    // -------------------------------------------------------

    Route::get('/reports/daily-summary', [ReportController::class, 'dailySummary'])->middleware('can:view-reports');
    Route::get('/reports/weekly-sales', [ReportController::class, 'weeklySales'])->middleware('can:view-reports');
    Route::get('/reports/recent-orders', [ReportController::class, 'recentOrders'])->middleware('can:view-reports');
    Route::get('/reports/top-items', [ReportController::class, 'topSellingItems'])->middleware('can:view-reports');
    Route::get('/reports/export-csv', [ReportController::class, 'exportSalesCsv'])->middleware('can:view-reports');

    // -------------------------------------------------------
    // STAFF & ATTENDANCE
    // -------------------------------------------------------

    Route::get('/staff', [StaffController::class, 'index'])->middleware('can:manage-staff');
    Route::get('/roles', fn() => response()->json(\App\Models\Role::all()));
    Route::middleware('can:manage-staff')->group(function () {
        Route::post('/staff', [StaffController::class, 'store']);
        Route::put('/staff/{staff}', [StaffController::class, 'update']);
        Route::delete('/staff/{staff}', [StaffController::class, 'destroy']);
    });

    // Attendance
    Route::get('/attendance/status', [AttendanceController::class, 'status']);
    Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn']);
    Route::post('/attendance/clock-out', [AttendanceController::class, 'clockOut']);
    Route::get('/attendance/history', [AttendanceController::class, 'index']);

    // -------------------------------------------------------
    // EXPENSES
    // -------------------------------------------------------

    Route::get('/expenses/summary', [ExpenseController::class, 'monthlySummary'])->middleware('can:view-reports');
    Route::apiResource('expenses', ExpenseController::class)->middleware('can:view-reports');

    // -------------------------------------------------------
    // SETTINGS (Admin only)
    // -------------------------------------------------------

    Route::middleware('can:manage-staff')->group(function () {
        Route::get('/settings', [SettingController::class, 'index']);
        Route::post('/settings', [SettingController::class, 'updateAll']);
    });

    // -------------------------------------------------------
    // SHIFT MANAGEMENT
    // -------------------------------------------------------

    Route::get('/shifts', [ShiftController::class, 'index']);
    Route::get('/shifts/current', [ShiftController::class, 'current']);
    Route::post('/shifts/open', [ShiftController::class, 'open']);
    Route::post('/shifts/close', [ShiftController::class, 'close']);

    // Daily Closing Report
    Route::get('/reports/daily-closing', [ShiftController::class, 'dailyReport'])->middleware('can:view-reports');

    // -------------------------------------------------------
    // ADMIN OPERATIONS
    // -------------------------------------------------------

    Route::middleware('can:manage-staff')->group(function () {
        // Plan assignment removed — no subscription system
    });
});
