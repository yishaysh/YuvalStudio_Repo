#!/bin/bash

# Build the project
npm run build --quiet > /dev/null 2>&1

# Start preview server
npm run preview -- --port 4173 > /dev/null 2>&1 &
PREVIEW_PID=$!

# Wait for the server to be ready
sleep 5

TARGET_URL="http://localhost:4173/"

total_time=0
for i in {1..5}; do
  TIME_RESULT=$(curl -o /dev/null -s -w "%{time_total}" "$TARGET_URL")
  total_time=$(awk "BEGIN {print $total_time + $TIME_RESULT}")
done

# Output the average load time as a single float number
awk "BEGIN {print ($total_time / 5.0)}"

# Clean up
kill $PREVIEW_PID
wait $PREVIEW_PID 2>/dev/null