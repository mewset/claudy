#!/bin/bash

# Claudy demo video script
# Creates a choreographed demo with states and speech bubbles
# Duration: ~35 seconds

WS_URL="ws://localhost:3695"

send() {
    local state="$1"
    local bubble="$2"

    if [ -n "$bubble" ]; then
        echo "{\"current_state\": \"$state\", \"active_projects\": [\"demo\"], \"bubble_text\": \"$bubble\", \"suppress_comments\": true}" | websocat -n1 "$WS_URL" > /dev/null
    else
        echo "{\"current_state\": \"$state\", \"active_projects\": [\"demo\"], \"suppress_comments\": true}" | websocat -n1 "$WS_URL" > /dev/null
    fi
    echo "→ $state ${bubble:+\"$bubble\"}"
}

echo "=== Claudy Demo Video Script ==="
echo "Make sure Claudy is running!"
echo "Starting in 3 seconds..."
sleep 3

# === INTRO (8 sec) ===
send "intro"
sleep 2.5

send "wake" "Hi, I'm Claudy!"
sleep 3

send "idle" "Your coding companion."
sleep 2.5

# === PERSONALITY (8 sec) ===
send "thinking" "I promise not to be like Clippy..."
sleep 3

send "happy" "...okay maybe a little."
sleep 2.5

send "listening" "I react to everything Claude does!"
sleep 2.5

# === DEMO WORK SEQUENCE (12 sec) ===
send "idle" "Watch this..."
sleep 2

send "listening"
sleep 1

send "thinking"
sleep 1.5

send "working"
sleep 2

send "thinking"
sleep 1

send "working"
sleep 2

send "happy" "Done! That was some serious coding."
sleep 3

# === ERROR HANDLING (5 sec) ===
send "confused" "Oops... that doesn't look right."
sleep 2.5

send "thinking"
sleep 1

send "happy" "Fixed it!"
sleep 2

# === OUTRO (7 sec) ===
send "idle" "I live in your system tray."
sleep 2.5

send "listening" "Vibe with Claude, I'll keep you company!"
sleep 3

send "sleepy"
sleep 8

# === GITHUB PLUG ===
send "wake" "OH, and please give me a star on github.com/mewset/claudy"
sleep 6

send "sleepy"
sleep 2

echo ""
echo "=== Demo complete! (~50 sec) ==="
