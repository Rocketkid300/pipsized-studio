#!/usr/bin/env bash
cd "$(dirname "$0")/dashboard" && (sleep 1; xdg-open http://localhost:4777 2>/dev/null || open http://localhost:4777) & node "$(dirname "$0")/dashboard/server.mjs"
