#!/usr/bin/env python3
"""
Run the Crypto Repo Analyzer web UI.

Run from the python-analyzer directory:
  python3 run_web.py

Or from repo root:  ./run-web.sh

Then open http://127.0.0.1:8000
"""
import sys
import os

# Ensure crypto_analyzer is importable when run from python-analyzer/
if __name__ == "__main__":
    _dir = os.path.dirname(os.path.abspath(__file__))
    if _dir not in sys.path:
        sys.path.insert(0, _dir)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "crypto_analyzer.web.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
