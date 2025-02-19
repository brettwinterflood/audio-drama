#!/bin/bash

SESSION_NAME="mysession"

# Kill existing session if it exists
tmux kill-session -t $SESSION_NAME 2>/dev/null

# Create a new tmux session and run FastAPI with hot reloading
tmux new-session -s $SESSION_NAME \; \
    send-keys 'cd backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload' C-m \; \
    split-window -h \; \
    select-pane -t 1 \; \
    send-keys 'cd frontend && npm run dev' C-m