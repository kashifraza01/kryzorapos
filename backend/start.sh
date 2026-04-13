#!/bin/bash
set -e

echo "=== KryzoraPOS Backend Starting ==="

# Ensure storage directories exist
mkdir -p storage/framework/{sessions,views,cache}
mkdir -p storage/logs
mkdir -p bootstrap/cache

# Set permissions
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# Install dependencies if vendor missing
if [ ! -d "vendor" ]; then
    echo "Installing composer dependencies..."
    composer install --no-dev --optimize-autoloader --no-interaction
fi

# Create .env from example if missing
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    php artisan key:generate --force
fi

# Cache config
php artisan config:cache 2>/dev/null || true
php artisan route:cache 2>/dev/null || true
php artisan view:cache 2>/dev/null || true

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Create storage link
php artisan storage:link 2>/dev/null || true

# Start the server
echo "Starting server on port ${PORT:-8080}..."
php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
