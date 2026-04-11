<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RestaurantTable extends Model
{
    use HasFactory;

    protected $fillable = ['table_number', 'capacity', 'status', 'x_pos', 'y_pos'];

    public function orders()
    {
        return $this->hasMany(Order::class , 'table_id');
    }
}
