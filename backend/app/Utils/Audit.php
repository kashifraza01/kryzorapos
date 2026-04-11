<?php

namespace App\Utils;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class Audit
{
    /**
     * Log a sensitive business action.
     */
    public static function log($action, $model = null, $oldData = null, $newData = null, $message = '')
    {
        try {
            ActivityLog::create([
                'user_id' => Auth::id() ?? 1,
                'action' => $action,
                'model_type' => $model ? get_class($model) : null,
                'model_id' => $model ? $model->id : null,
                'old_values' => $oldData ? $oldData : null,
                'new_values' => $newData ? $newData : null,
                'description' => $message,
                'ip_address' => request()->ip(),
            ]);
        } catch (\Exception $e) {
            \Log::error("Audit Log Failed: " . $e->getMessage());
        }
    }
}
