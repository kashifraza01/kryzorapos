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

# ============================================================
# ENV FILE HANDLING — Railway-aware
# ============================================================
# On Railway, environment variables are set via the dashboard.
# Laravel reads OS env vars ONLY when there is NO .env file.
# So on Railway we must NOT create a .env file, otherwise it
# overrides the Railway-provided DATABASE_URL / DB_* vars.
# ============================================================
if [ -z "$RAILWAY_ENVIRONMENT" ] && [ ! -f ".env" ]; then
    echo "Local dev detected — creating .env from .env.example..."
    cp .env.example .env
    php artisan key:generate --force
fi

# Generate APP_KEY if not set (to prevent 500 errors on Railway)
if [ -z "$APP_KEY" ]; then
    echo "WARNING: APP_KEY not set. Generating a temporary one for this instance to prevent crash."
    export APP_KEY=$(php artisan key:generate --show --no-ansi)
    
    # If .env does not exist, Laravel 11 may fail without an explicitly passed env var or a file.
    # We create a minimal .env to ensure the app doesn't crash
    if [ ! -f ".env" ]; then
        if [ -f ".env.cloud" ]; then
            echo "Copying .env.cloud to .env as baseline..."
            cp .env.cloud .env
        elif [ -f ".env.example" ]; then
            echo "Copying .env.example to .env..."
            cp .env.example .env
        else
            touch .env
        fi
        
        # Inject the key we just generated
        if grep -q "^APP_KEY=" .env; then
            # We use PHP instead of sed for cross-platform compatibility
            php -r "file_put_contents('.env', preg_replace('/^APP_KEY=.*$/m', 'APP_KEY='.$_ENV['APP_KEY'], file_get_contents('.env')));"
        else
            echo "APP_KEY=$APP_KEY" >> .env
        fi
    fi
fi

# Cache routes and views (NOT config — config must read env vars dynamically on Railway)
php artisan route:cache 2>/dev/null || true
php artisan view:cache 2>/dev/null || true

# Run migrations
echo "Running migrations..."
php artisan migrate --force 2>&1 || echo "Migration warning (may be OK on first deploy)"

# Seed essential data (roles, permissions, admin, settings)
# Uses firstOrCreate — safe to re-run on every deploy
echo "Seeding essential data..."
php artisan db:seed --class=KryzoraPOSSeeder --force 2>&1 || echo "Seeder warning (may be OK if already seeded)"

# Create storage link
php artisan storage:link 2>/dev/null || true

# Start the server
echo "Starting server on port ${PORT:-8080}..."
php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
