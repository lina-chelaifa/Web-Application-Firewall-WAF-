"""
ip_filter.py  —  IP Blocklist & Rate Limiter
First checkpoint in the Zero Trust pipeline.
Checks the sender's IP before any deep inspection happens.

Identity & Access Management concept:
  - Known bad actors (blocklist) are rejected at the door.
  - Automated/brute-force bots are detected by request frequency.
"""

import time
from collections import defaultdict
from database import get_db


# ── Rate limiter state (in-memory sliding window) ─────────────────────────────
# Stores  ip → list of request timestamps within the current window
_rate_window_seconds = 60       # sliding window: 1 minute
_rate_max_requests   = 100      # max requests per IP per window before blocking
_request_log: dict   = defaultdict(list)


def is_blocked(ip: str) -> tuple[bool, str]:
    """
    Check whether an IP address should be blocked.

    Returns:
        (True,  reason_string)  if the IP should be blocked
        (False, "")             if the IP is clean
    """
    # 1. Blocklist check
    if _in_blocklist(ip):
        return True, "IP is on the WAF blocklist"

    # 2. Rate limit check
    if _rate_exceeded(ip):
        return True, f"Rate limit exceeded: more than {_rate_max_requests} requests per minute"

    return False, ""


def _in_blocklist(ip: str) -> bool:
    """Query the persistent blocklist in the database."""
    conn = get_db()
    row  = conn.execute(
        "SELECT id FROM waf_blocklist WHERE ip = ?", (ip,)
    ).fetchone()
    conn.close()
    return row is not None


def _rate_exceeded(ip: str) -> bool:
    """
    Sliding-window rate limiter.
    Keeps track of request timestamps per IP in memory.
    """
    now = time.time()
    window_start = now - _rate_window_seconds

    # Remove timestamps outside the window
    _request_log[ip] = [t for t in _request_log[ip] if t > window_start]

    # Add current request
    _request_log[ip].append(now)

    return len(_request_log[ip]) > _rate_max_requests
