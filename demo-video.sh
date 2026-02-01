#!/bin/bash

# Claudy demo video script
# Creates a choreographed demo with states and speech bubbles

WS_URL="ws://localhost:3695"

send() {
    local state="$1"
    local bubble="$2"

    if [ -n "$bubble" ]; then
        echo "{\"current_state\": \"$state\", \"active_projects\": [\"demo\"], \"bubble_text\": \"$bubble\"}" | websocat -n1 "$WS_URL" > /dev/null
    else
        echo "{\"current_state\": \"$state\", \"active_projects\": [\"demo\"]}" | websocat -n1 "$WS_URL" > /dev/null
    fi
    echo "→ $state ${bubble:+\"$bubble\"}"
}

echo "=== Claudy Demo Video Script ==="
echo "Make sure Claudy is running!"
echo "Starting in 3 seconds..."
sleep 3

# Intro sequence
send "intro"
sleep 2

send "wake" "Hi, I'm Claudy!"
sleep 3

send "idle" "I promise not to be like Clippy..."
sleep 2.5

send "thinking" "...maybe."
sleep 2

send "listening" "I react to everything Claude does!"
sleep 3

send "idle" "Check this out..."
sleep 2

# Work sequence
send "thinking"
sleep 1

send "working"
sleep 1.5

send "thinking"
sleep 0.8

send "working"
sleep 1.2

send "thinking"
sleep 0.5

send "working"
sleep 1

send "happy" "Phew... that was hard work!"
sleep 3

# Outro
send "idle" "Follow along while you vibe with Claude!"
sleep 3

send "sleepy"
sleep 2

echo ""
echo "=== Demo complete! ==="
