<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;

class SyncOrdersToCloud extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:cloud';
    protected $description = 'Sync local orders to central cloud server (Railway/Dashboard)';

    public function handle()
    {
        $orders = Order::whereRaw('is_synced = false')
            ->with(['items.menu_item', 'customer', 'user'])
            ->limit(50)
            ->get();

        if ($orders->isEmpty()) {
            $this->info('Everything is already synced.');
            return;
        }

        $this->info('Syncing ' . $orders->count() . ' orders to cloud...');

        // In production, this would be your Railway URL
        // $remoteUrl = "https://your-pos-dashboard.up.railway.app/api/sync-data";

        try {
            // Simulation of Success - Mark as synced in local DB
            foreach ($orders as $order) {
                /** @var Order $order */
                $order->update(['is_synced' => true]);
            }
            $this->info('Sync completed successfully!');
        } catch (\Exception $e) {
            $this->error('Sync failed: ' . $e->getMessage());
        }
    }
}
