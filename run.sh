#!/bin/bash
cd "$(dirname "$0")"

# Get the current IP address
IP=$(hostname -I | awk '{print $1}')

if [ -z "$IP" ]; then
  echo "Could not determine IP address."
  exit 1
fi

echo "Starting Checklisty on http://${IP}:3001"
echo "Open this URL in a browser on any device on the network."
echo ""

PORT=3001 node server.js
