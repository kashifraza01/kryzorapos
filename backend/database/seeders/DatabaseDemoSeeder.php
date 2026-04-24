<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\Shift;
use Carbon\Carbon;

class DatabaseDemoSeeder extends Seeder
{
    public function run()
    {
        // Clean up partials
        Order::query()->delete();
        OrderItem::query()->delete();
        Payment::query()->delete();
        Shift::query()->delete();
        Expense::query()->delete();

        \Illuminate\Support\Facades\DB::beginTransaction();

        $categories = [
            'Burgers' => [
                ['name' => 'Classic Zinger', 'price' => 450],
                ['name' => 'Beef Smash', 'price' => 600],
            ],
            'Pizzas' => [
                ['name' => 'Fajita Medium', 'price' => 1200],
                ['name' => 'Pepperoni Large', 'price' => 1800],
            ],
            'Drinks' => [
                ['name' => 'Cola 500ml', 'price' => 120],
                ['name' => 'Mineral Water', 'price' => 80],
            ]
        ];

        $menuItems = [];
        foreach ($categories as $catName => $items) {
            $cat = MenuCategory::firstOrCreate(['name' => $catName], ['is_active' => true]);
            foreach ($items as $item) {
                $menuItems[] = MenuItem::firstOrCreate(
                    ['name' => $item['name'], 'category_id' => $cat->id],
                    [
                        'price' => $item['price'],
                        'cost_price' => $item['price'] * 0.6,
                        'is_available' => true,
                    ]
                );
            }
        }

        // 2. Generate 1 Month of Orders
        $startDate = Carbon::now()->subDays(30);
        $endDate = Carbon::now();

        while ($startDate <= $endDate) {
            // Random expenses
            if (rand(1, 100) > 70) {
                Expense::create([
                    'category' => 'utilities',
                    'description' => 'Daily expense record',
                    'amount' => rand(1000, 5000),
                    'expense_date' => $startDate->toDateString(),
                    'notes' => 'Daily expense',
                    'user_id' => 1
                ]);
            }

            // Create a shift for the day
            $shift = Shift::create([
                'user_id' => 1,
                'status' => 'closed',
                'opening_balance' => 5000,
                'opened_at' => $startDate->copy()->setHour(9),
                'closed_at' => $startDate->copy()->setHour(23),
            ]);

            // Create 5 to 15 orders a day
            $dailyOrders = rand(5, 15);
            $cashTotal = 0;

            for ($i = 0; $i < $dailyOrders; $i++) {
                $subtotal = 0;
                $orderItems = [];

                // 1-3 items per order
                for ($j = 0; $j < rand(1, 3); $j++) {
                    $item = $menuItems[array_rand($menuItems)];
                    $qty = rand(1, 4);
                    $subtotal += $item->price * $qty;
                    $orderItems[] = [
                        'menu_item_id' => $item->id,
                        'quantity' => $qty,
                        'unit_price' => $item->price,
                        'subtotal' => $item->price * $qty,
                    ];
                }

                $order = Order::create([
                    'user_id' => 1,
                    'order_type' => ['dine-in', 'takeaway', 'delivery'][rand(0, 2)],
                    'status' => 'completed',
                    'payment_status' => 'paid',
                    'subtotal' => $subtotal,
                    'tax_amount' => 0,
                    'discount_amount' => 0,
                    'total_amount' => $subtotal,
                    'shift_id' => $shift->id,
                    'created_at' => $startDate->copy()->setHour(rand(10, 22))->setMinute(rand(0, 59)),
                    'updated_at' => clone $startDate,
                ]);

                foreach ($orderItems as $oi) {
                    $oi['order_id'] = $order->id;
                    OrderItem::create($oi);
                }

                Payment::create([
                    'order_id' => $order->id,
                    'shift_id' => $shift->id,
                    'payment_method' => 'cash',
                    'amount' => $subtotal,
                    'status' => 'success',
                    'created_at' => $order->created_at,
                    'updated_at' => $order->created_at,
                ]);

                $cashTotal += $subtotal;
            }

            // Close shift — only update actual DB columns
            // (cash_total, total_revenue, order_count are computed accessors, not columns)
            $shift->update([
                'actual_cash' => 5000 + $cashTotal,
                'closing_balance' => 5000 + $cashTotal,
                'difference' => 0,
            ]);

            $startDate->addDay();
        }
        \Illuminate\Support\Facades\DB::commit();
    }
}
