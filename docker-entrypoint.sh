#!/bin/sh
echo "window.API_URL = '${API_URL:-http://localhost:8001}';" > /usr/share/nginx/html/config.js
exec nginx -g 'daemon off;'
