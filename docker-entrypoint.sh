#!/bin/sh

set -e

echo "Starting Notida API..."

cd /notida/api
node server.js &

API_PID=$!

echo "Starting Nginx..."

nginx -g "daemon off;" &
NGINX_PID=$!

trap 'kill $API_PID $NGINX_PID 2>/dev/null || true' TERM INT

wait -n $API_PID $NGINX_PID
