#!/bin/bash
# Start Go backend
cd /workspace/identity-platform
PGPASSWORD=identity_dev /tmp/id-server &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 3

# Start auth-web frontend
cd /workspace/identity-platform/web/apps/auth-web
npx next dev --port 3001 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend
sleep 5

echo "Demo running:"
echo "  Backend:  http://localhost:8080"
echo "  Frontend: http://localhost:3001"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
