#!/bin/bash

# BoxOffice Startup Script

echo "🎬 Starting BoxOffice..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Check if frontend is built
if [ ! -d "frontend/build" ]; then
    echo "🏗️  Building frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    npm run build
    cd ..
fi

# Start the server
echo "🚀 Starting server..."
echo ""
npm start

