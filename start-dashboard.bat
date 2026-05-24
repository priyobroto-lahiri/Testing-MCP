@echo off
echo Starting Dashboard Backend (Bundled)...
start "Dashboard Backend" node dist/dashboard-server/index.js
echo Access at: http://localhost:3001
