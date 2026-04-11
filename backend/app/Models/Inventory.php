<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;

    protected $table = 'inventory'; // Explicit since plural is inventories normally

    protected $fillable = ['item_name', 'quantity', 'unit', 'low_stock_threshold'];

    public function logs()
    {
        return $this->hasMany(InventoryLog::class , 'inventory_id');
    }
}
