FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    unzip \
    git \
    curl

# Install composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy full project
COPY . .

# Go into backend and install dependencies
WORKDIR /app/backend
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Run PHP server (change if Laravel etc)
CMD php -S 0.0.0.0:8000 -t public
