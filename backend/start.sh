#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Run uvicorn with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
