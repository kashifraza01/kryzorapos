<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $fillable = [
        'user_id',
        'opening_balance',
        'closing_balance',
        'actual_cash',
        'difference',
        'status',
        'opened_at',
        'closed_at',
        'note',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'actual_cash'     => 'decimal:2',
        'difference'      => 'decimal:2',
        'opened_at'       => 'datetime',
        'closed_at'       => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get total cash sales during this shift.
     */
    public function getCashTotalAttribute()
    {
        return $this->payments()
            ->where('payment_method', 'cash')
            ->where('status', 'success')
            ->sum('amount');
    }

    /**
     * Get total card sales during this shift.
     */
    public function getCardTotalAttribute()
    {
        return $this->payments()
            ->whereIn('payment_method', ['card', 'easypaisa', 'jazzcash'])
            ->where('status', 'success')
            ->sum('amount');
    }

    /**
     * Get total revenue during this shift (all payment methods).
     */
    public function getTotalRevenueAttribute()
    {
        return $this->payments()
            ->where('status', 'success')
            ->sum('amount');
    }

    /**
     * Get order count during this shift.
     */
    public function getOrderCountAttribute()
    {
        return $this->orders()->count();
    }
}
