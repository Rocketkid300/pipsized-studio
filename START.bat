@echo off
cd /d "%~dp0dashboard"
start "" http://localhost:4777
node server.mjs
