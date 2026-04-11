<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'shift_id',
        'customer_id',
        'table_id',
        'order_type',
        'status',
        'payment_status',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'delivery_charge',
        'total_amount',
        'delivery_address',
        'notes',
        'rider_id',
        'waiter_id',
        'order_number',
        'fbr_invoice_number',
        'is_synced',
        'order_source',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }

    public function table()
    {
        return $this->belongsTo(RestaurantTable::class , 'table_id');
    }

    public function waiter()
    {
        return $this->belongsTo(User::class, 'waiter_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
