#!/bin/bash
# Check if server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Server is running on port 3000"
  curl -s http://localhost:3000 > /tmp/homepage.html
  echo "Homepage fetched successfully"
else
  echo "Server is NOT running on port 3000"
  ps aux | grep node | grep -v grep > /tmp/node-processes.txt
  if [ -s /tmp/node-processes.txt ]; then
    echo "But Node processes exist:"
    cat /tmp/node-processes.txt
  else
    echo "No Node processes found"
  fi
fi
