<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with('user');

        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        return response()->json($query->orderByDesc('expense_date')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|string',
            'description' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
        ]);

        $validated['user_id'] = auth()->id();

        $expense = Expense::create($validated);
        return response()->json($expense, 201);
    }

    public function monthlySummary()
    {
        $monthlyTotal = Expense::whereMonth('expense_date', now()->month)->sum('amount');
        $todayTotal = Expense::whereDate('expense_date', now()->toDateString())->sum('amount');
        $byCategory = Expense::selectRaw('category, SUM(amount) as total')
            ->whereMonth('expense_date', now()->month)
            ->groupBy('category')
            ->get();

        return response()->json([
            'total_expenses' => $monthlyTotal,
            'today_expenses' => $todayTotal,
            'by_category' => $byCategory
        ]);
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);
        $expense->delete();
        return response()->json(['message' => 'Expense deleted']);
    }
}
