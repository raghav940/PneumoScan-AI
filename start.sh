#!/bin/bash

echo "Starting backend (ml_service)..."
cd ml_service
source venv/bin/activate
python app.py &
BACKEND_PID=$!

echo "Starting frontend..."
cd ..
npm run dev

# Cleanup: kill backend when frontend stops (user presses Ctrl+C)
trap "kill $BACKEND_PID" EXIT
