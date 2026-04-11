<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Expense;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ShiftController extends Controller
{
    /**
     * Get all shifts (most recent first), with summaries.
     */
    public function index()
    {
        $shifts = Shift::with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($shift) {
                return [
                    'id'              => $shift->id,
                    'user'            => $shift->user,
                    'opening_balance' => $shift->opening_balance,
                    'closing_balance' => $shift->closing_balance,
                    'actual_cash'     => $shift->actual_cash,
                    'difference'      => $shift->difference,
                    'status'          => $shift->status,
                    'opened_at'       => $shift->opened_at,
                    'closed_at'       => $shift->closed_at,
                    'note'            => $shift->note,
                    'cash_total'      => $shift->cash_total,
                    'card_total'      => $shift->card_total,
                    'total_revenue'   => $shift->total_revenue,
                    'order_count'     => $shift->order_count,
                ];
            });

        return response()->json($shifts);
    }

    /**
     * Get the currently open shift for the authenticated user.
     */
    public function current()
    {
        $shift = Shift::where('user_id', auth()->id())
            ->where('status', 'open')
            ->latest()
            ->first();

        if (!$shift) {
            return response()->json(['shift' => null, 'message' => 'No open shift']);
        }

        return response()->json([
            'shift' => [
                'id'              => $shift->id,
                'opening_balance' => $shift->opening_balance,
                'status'          => $shift->status,
                'opened_at'       => $shift->opened_at,
                'cash_total'      => $shift->cash_total,
                'card_total'      => $shift->card_total,
                'total_revenue'   => $shift->total_revenue,
                'order_count'     => $shift->order_count,
            ],
        ]);
    }

    /**
     * Open a new shift.
     */
    public function open(Request $request)
    {
        $request->validate([
            'opening_balance' => 'required|numeric|min:0',
        ]);

        // Check if user already has an open shift
        $existing = Shift::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have an open shift. Close it first.',
                'shift'   => $existing,
            ], 422);
        }

        $shift = Shift::create([
            'user_id'         => auth()->id(),
            'opening_balance' => $request->opening_balance,
            'status'          => 'open',
            'opened_at'       => now(),
        ]);

        return response()->json([
            'message' => 'Shift opened successfully',
            'shift'   => $shift,
        ]);
    }

    /**
     * Close the current shift with cash tally.
     */
    public function close(Request $request)
    {
        $request->validate([
            'actual_cash' => 'required|numeric|min:0',
            'note'        => 'nullable|string|max:500',
        ]);

        $shift = Shift::where('user_id', auth()->id())
            ->where('status', 'open')
            ->latest()
            ->first();

        if (!$shift) {
            return response()->json(['message' => 'No open shift to close'], 422);
        }

        // Calculate expected closing balance
        $cashSales = $shift->cash_total;
        $expectedCash = $shift->opening_balance + $cashSales;

        $shift->update([
            'closing_balance' => $expectedCash,
            'actual_cash'     => $request->actual_cash,
            'difference'      => $request->actual_cash - $expectedCash,
            'status'          => 'closed',
            'closed_at'       => now(),
            'note'            => $request->note,
        ]);

        return response()->json([
            'message'          => 'Shift closed successfully',
            'shift'            => $shift->fresh(),
            'expected_cash'    => round($expectedCash, 2),
            'actual_cash'      => round($request->actual_cash, 2),
            'difference'       => round($request->actual_cash - $expectedCash, 2),
            'total_revenue'    => round($shift->total_revenue, 2),
            'order_count'      => $shift->order_count,
        ]);
    }

    /**
     * Daily Closing Report — End-of-day summary
     */
    public function dailyReport(Request $request)
    {
        $date = $request->get('date', now()->toDateString());

        $orders = Order::whereDate('created_at', $date)
            ->where('payment_status', 'paid')
            ->get();

        $payments = Payment::whereDate('created_at', $date)
            ->where('status', 'success')
            ->get();

        $expenses = Expense::where('expense_date', $date)->get();

        // Revenue by payment method
        $cashRevenue      = $payments->where('payment_method', 'cash')->sum('amount');
        $cardRevenue      = $payments->where('payment_method', 'card')->sum('amount');
        $easypaisaRevenue = $payments->where('payment_method', 'easypaisa')->sum('amount');
        $jazzcashRevenue  = $payments->where('payment_method', 'jazzcash')->sum('amount');
        $totalRevenue     = $payments->sum('amount');

        // Order stats
        $totalOrders     = $orders->count();
        $dineInOrders    = $orders->where('order_type', 'dine-in')->count();
        $takeawayOrders  = $orders->where('order_type', 'takeaway')->count();
        $deliveryOrders  = $orders->where('order_type', 'delivery')->count();
        $cancelledOrders = Order::whereDate('created_at', $date)->where('status', 'cancelled')->count();

        // Expense summary
        $totalExpenses = $expenses->sum('amount');
        $expenseByCategory = $expenses->groupBy('category')->map(fn($g) => round($g->sum('amount'), 2));

        // Gross profit (revenue - cost if cost_price is tracked)
        $grossRevenue = $orders->sum('subtotal');
        $totalTax     = $orders->sum('tax_amount');
        $totalDiscount = $orders->sum('discount_amount');

        // Shift summary for today
        $shifts = Shift::whereDate('opened_at', $date)->with('user:id,name')->get();

        return response()->json([
            'date'     => $date,
            'revenue'  => [
                'total'     => round($totalRevenue, 2),
                'cash'      => round($cashRevenue, 2),
                'card'      => round($cardRevenue, 2),
                'easypaisa' => round($easypaisaRevenue, 2),
                'jazzcash'  => round($jazzcashRevenue, 2),
            ],
            'orders' => [
                'total'     => $totalOrders,
                'dine_in'   => $dineInOrders,
                'takeaway'  => $takeawayOrders,
                'delivery'  => $deliveryOrders,
                'cancelled' => $cancelledOrders,
            ],
            'financials' => [
                'gross_revenue'  => round($grossRevenue, 2),
                'tax_collected'  => round($totalTax, 2),
                'discounts_given' => round($totalDiscount, 2),
                'total_expenses' => round($totalExpenses, 2),
                'net_revenue'    => round($totalRevenue - $totalExpenses, 2),
            ],
            'expenses_by_category' => $expenseByCategory,
            'shifts' => $shifts->map(fn($s) => [
                'id'              => $s->id,
                'user'            => $s->user?->name,
                'status'          => $s->status,
                'opened_at'       => $s->opened_at,
                'closed_at'       => $s->closed_at,
                'opening_balance' => $s->opening_balance,
                'actual_cash'     => $s->actual_cash,
                'difference'      => $s->difference,
            ]),
        ]);
    }
}
