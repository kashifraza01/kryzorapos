<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MenuItemIngredient extends Model
{
    use HasFactory;

    protected $fillable = ['menu_item_id', 'inventory_id', 'quantity_required'];

    public function menuItem()
    {
        return $this->belongsTo(MenuItem::class);
    }

    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }
}
