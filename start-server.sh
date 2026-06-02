#!/bin/bash
echo "Server starting..." >> /tmp/server.log
npm start 2>&1 | tee -a /tmp/server.log
