<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    use HasFactory;

    protected $fillable = ['category_id', 'name', 'description', 'price', 'cost_price', 'image', 'is_available', 'stock_type'];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        if ($this->image) {
            return '/storage/' . $this->image;
        }
        return null;
    }

    public function category()
    {
        return $this->belongsTo(MenuCategory::class);
    }

    public function ingredients()
    {
        return $this->hasMany(MenuItemIngredient::class);
    }
}
