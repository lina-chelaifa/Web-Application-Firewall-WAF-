"""
logger.py  —  WAF Event Logger
Writes every WAF decision (BLOCK or ALLOW) to the database asynchronously
so that logging never adds latency to the request pipeline.

Risk Management concept:
  You cannot manage a risk you cannot see.
  Every single request is recorded — not just blocked ones.
"""

import uuid
import threading
import queue
from datetime import datetime, timezone
from database import get_db

# Async write queue — log entries are pushed here and written by a background thread
_log_queue = queue.Queue()
_worker_started = False


def _generate_event_id():
    """Generate a unique, human-readable event ID."""
    ts  = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    uid = str(uuid.uuid4())[:8].upper()
    return f"EVT-{ts}-{uid}"


def log_event(source_ip, method, path, rule_name, score, action,
              payload=None, user_agent=None, status_code=None,
              flask_app=None):
    """
    Push a WAF event onto the async write queue.
    Returns the generated event ID immediately (non-blocking).

    Args:
        source_ip   : str  — client IP address
        method      : str  — HTTP method (GET, POST …)
        path        : str  — request URL path
        rule_name   : str  — name of the matched rule, or None if clean
        score       : int  — total anomaly score
        action      : str  — "BLOCK" or "ALLOW"
        payload     : str  — short snippet of suspicious content (optional)
        user_agent  : str  — User-Agent header value (optional)
        status_code : int  — HTTP status code returned to client (optional)
        flask_app   : Flask app instance — for WebSocket push (optional)
    """
    global _worker_started
    event_id = _generate_event_id()

    event = {
        "id":          event_id,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "source_ip":   source_ip,
        "method":      method,
        "path":        path,
        "rule_name":   rule_name,
        "score":       score,
        "action":      action,
        "payload":     (payload or "")[:200],   # store at most 200 chars
        "user_agent":  (user_agent or "")[:300],
        "status_code": status_code,
        "flask_app":   flask_app,
    }

    _log_queue.put(event)

    # Start background writer thread on first use
    if not _worker_started:
        _worker_started = True
        t = threading.Thread(target=_writer_worker, daemon=True)
        t.start()

    return event_id


def _writer_worker():
    """Background thread: drain the queue and write events to SQLite."""
    while True:
        try:
            event = _log_queue.get(timeout=1)
            flask_app = event.pop("flask_app", None)
            _write_to_db(event)

            # Push real-time notification to Admin Dashboard via WebSocket
            if flask_app and hasattr(flask_app, "socketio") and event["action"] == "BLOCK":
                try:
                    with flask_app.app_context():
                        flask_app.socketio.emit("new_block_event", {
                            "id":        event["id"],
                            "timestamp": event["timestamp"],
                            "source_ip": event["source_ip"],
                            "path":      event["path"],
                            "rule_name": event["rule_name"],
                            "score":     event["score"],
                        })
                except Exception:
                    pass    # don't let WebSocket errors kill the logger

        except queue.Empty:
            continue
        except Exception as e:
            print(f"[ Logger ] Write error: {e}")


def _write_to_db(event):
    """Persist one event record to the waf_events table."""
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO waf_events
              (id, timestamp, source_ip, method, path,
               rule_name, score, action, payload, user_agent, status_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event["id"],
            event["timestamp"],
            event["source_ip"],
            event["method"],
            event["path"],
            event["rule_name"],
            event["score"],
            event["action"],
            event["payload"],
            event["user_agent"],
            event["status_code"],
        ))
        conn.commit()
    finally:
        conn.close()
