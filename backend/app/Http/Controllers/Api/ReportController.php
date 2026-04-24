<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dailySummary()
    {
        $today = now()->toDateString();
        
        $totalRevenue = Order::whereDate('created_at', $today)->where('payment_status', 'paid')->sum('total_amount');
        $totalOrders = Order::whereDate('created_at', $today)->count();
        
        // Calculate Ingredient Cost for today's orders
        $costOfSales = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('menu_items', 'order_items.menu_item_id', '=', 'menu_items.id')
            ->whereDate('orders.created_at', $today)
            ->where('orders.payment_status', 'paid')
            ->sum(DB::raw('order_items.quantity * menu_items.cost_price'));

        $todayExpenses = Expense::whereDate('expense_date', $today)->sum('amount');
        
        $grossProfit = $totalRevenue - $costOfSales;
        $netProfit = $grossProfit - $todayExpenses;

        $totalStaff = User::count();

        return response()->json([
            'total_orders' => (int)$totalOrders,
            'total_revenue' => (float)$totalRevenue,
            'estimated_profit' => (float)$grossProfit,
            'today_expenses' => (float)$todayExpenses,
            'true_profit' => (float)$netProfit,
            'staff_total' => $totalStaff
        ]);
    }

    public function weeklySales()
    {
        $data = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $sales = Order::whereDate('created_at', $date)->where('payment_status', 'paid')->sum('total_amount');
            $data[] = [
                'date' => now()->subDays($i)->format('M d'), // e.g. Mar 15
                'sales' => (float)$sales
            ];
        }
        return response()->json($data);
    }

    public function topSellingItems()
    {
        $topItems = OrderItem::select(
                'menu_items.name as item_name',
                'menu_item_id',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(order_items.subtotal) as total_revenue'),
                DB::raw('SUM(order_items.subtotal - (order_items.quantity * menu_items.cost_price)) as total_profit')
            )
            ->join('menu_items', 'order_items.menu_item_id', '=', 'menu_items.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.payment_status', 'paid')
            ->groupBy('menu_item_id', 'menu_items.name')
            ->orderByDesc('total_qty')
            ->limit(10)
            ->get()
            ->map(function($item) {
                return [
                    'item_name' => $item->item_name ?? 'Deleted Item',
                    'total_qty' => (int)$item->total_qty,
                    'total_revenue' => (float)$item->total_revenue,
                    'total_profit' => (float)$item->total_profit
                ];
            });

        return response()->json($topItems);
    }

    public function recentOrders(Request $request)
    {
        $perPage = min($request->get('per_page', 50), 100);

        return response()->json(
            Order::with(['table', 'items.menu_item', 'user', 'waiter'])
                ->orderByDesc('id')
                ->paginate($perPage)
        );
    }

    public function exportSalesCsv()
    {
        $orders = Order::where('payment_status', 'paid')->orderByDesc('created_at')->limit(100)->get();
        
        $output = "Order ID,Date,Type,Amount\n";
        foreach ($orders as $order) {
            $output .= "{$order->id},{$order->created_at},{$order->order_type},{$order->total_amount}\n";
        }

        return response($output, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="sales_report.csv"',
        ]);
    }
}
