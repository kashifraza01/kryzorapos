<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class KitchenController extends Controller
{
    public function index()
    {
        $orders = Order::with(['items.menu_item', 'table'])
            ->whereIn('status', ['pending', 'cooking', 'ready'])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($orders);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,cooking,ready,completed,cancelled'
        ]);

        $order = Order::findOrFail($id);
        $order->update(['status' => $validated['status']]);

        return response()->json($order);
    }

    /**
     * Server-Sent Events stream for real-time kitchen display updates.
     * Pushes active orders every 3 seconds so the kitchen screen auto-refreshes.
     */
    public function stream()
    {
        return response()->stream(function () {
            $maxIterations = 100; // ~5 minutes at 3-second intervals
            $i = 0;

            while ($i < $maxIterations) {
                if (connection_aborted()) {
                    break;
                }

                $orders = Order::with(['items.menu_item', 'table'])
                    ->whereIn('status', ['pending', 'cooking', 'ready'])
                    ->orderBy('created_at', 'asc')
                    ->get();

                echo "data: " . json_encode($orders) . "\n\n";
                ob_flush();
                flush();

                sleep(3);
                $i++;
            }
        }, 200, [
            'Content-Type'  => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection'    => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
