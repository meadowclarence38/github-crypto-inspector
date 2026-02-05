#!/bin/bash
# Run the Crypto Repo Analyzer web UI from repo root.
# Usage: ./run-web.sh   (or: bash run-web.sh)

set -e
cd "$(dirname "$0")/python-analyzer"

if [ -d .venv ]; then
  .venv/bin/python run_web.py
else
  python3 run_web.py
fi
