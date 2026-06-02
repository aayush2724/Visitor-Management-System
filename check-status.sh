#!/bin/bash
OUTPUT="/tmp/server-status.txt"
echo "Checking server status..." > $OUTPUT
echo "" >> $OUTPUT

# Check if port 3000 is listening
if lsof -i:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "✓ Port 3000 is LISTENING" >> $OUTPUT
    
    # Try to fetch homepage
    if curl -s http://localhost:3000 > /tmp/page.html 2>&1; then
        echo "✓ Server is RESPONDING" >> $OUTPUT
        echo "" >> $OUTPUT
        echo "First 20 lines of response:" >> $OUTPUT
        head -20 /tmp/page.html >> $OUTPUT
    else
        echo "✗ Server not responding to HTTP requests" >> $OUTPUT
    fi
else
    echo "✗ Port 3000 is NOT listening" >> $OUTPUT
    echo "" >> $OUTPUT
    echo "Running Node processes:" >> $OUTPUT
    ps aux | grep node | grep -v grep >> $OUTPUT
fi

cat $OUTPUT
