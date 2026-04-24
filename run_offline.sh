#!/bin/bash

echo "Starting Kryzora POS Offline Mode..."

# Start Backend
echo "Starting Backend..."
cd backend || exit
php artisan serve &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd frontend || exit
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Waiting for servers to initialize..."
sleep 5

echo "Opening in Browser..."
# Windows (Git Bash/WSL) usually supports 'explorer' or 'start'
if command -v start &> /dev/null; then
    start chrome "http://localhost:5173" || start "http://localhost:5173"
elif command -v explorer.exe &> /dev/null; then
    explorer.exe "http://localhost:5173"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173"
elif command -v open &> /dev/null; then
    open -a "Google Chrome" "http://localhost:5173" || open "http://localhost:5173"
else
    echo "Please open http://localhost:5173 in your Google Chrome."
fi

echo "Both servers are running."
echo "Keep this terminal open! Press Ctrl+C to stop both servers."

# Trap Ctrl+C (SIGINT) to kill background processes
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT

# Keep script running
wait $BACKEND_PID
wait $FRONTEND_PID
