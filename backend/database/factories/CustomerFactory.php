<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '03' . fake()->numerify('#########'),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'loyalty_points' => rand(0, 1000)
        ];
    }
}
