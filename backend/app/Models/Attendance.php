<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = [
        'user_id',
        'clock_in',
        'clock_out',
        'total_hours',
        'status',
        'note'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
