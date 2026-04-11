<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class AutoBackup extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'app:auto-backup';

    /**
     * The console command description.
     */
    protected $description = 'Automatically backup the database to a local folder';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $connection = config('database.default');

        if ($connection !== 'sqlite') {
            $this->warn('Auto-backup is only supported for SQLite databases.');
            return;
        }

        $databasePath = config('database.connections.sqlite.database');
        $backupsFolder = base_path('backups');

        if (!File::exists($backupsFolder)) {
            File::makeDirectory($backupsFolder, 0755, true);
        }

        $filename = 'backup_' . date('Y_m_d_H_i_s') . '.sqlite';
        $destination = $backupsFolder . DIRECTORY_SEPARATOR . $filename;

        if (File::exists($databasePath)) {
            File::copy($databasePath, $destination);
            $this->info("Backup created successfully: {$filename}");

            // Cleanup old backups (keep last 10)
            $files = File::files($backupsFolder);
            if (count($files) > 10) {
                usort($files, function ($a, $b) {
                    return $a->getMTime() <=> $b->getMTime();
                });

                $toDelete = count($files) - 10;
                for ($i = 0; $i < $toDelete; $i++) {
                    File::delete($files[$i]);
                }
            }
        }
        else {
            $this->error("Database file not found at: {$databasePath}");
        }
    }
}
