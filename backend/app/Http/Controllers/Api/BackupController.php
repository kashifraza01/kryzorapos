<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class BackupController extends Controller
{
    public function download()
    {
        $connection = config('database.default');

        if ($connection === 'sqlite') {
            $dbPath = config('database.connections.sqlite.database');
            if (!$dbPath || !file_exists($dbPath)) {
                return response()->json(['error' => 'Database file not found'], 404);
            }
            $filename = 'kryzora_pos_backup_' . date('Y-m-d_His') . '.sqlite';
            return response()->download($dbPath, $filename);
        }

        return response()->json(['error' => 'Backup not available for this database driver'], 501);
    }
}
