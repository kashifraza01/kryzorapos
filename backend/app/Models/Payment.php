<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'shift_id', 'amount', 'payment_method', 'transaction_reference', 'status'
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }
}
