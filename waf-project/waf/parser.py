"""
parser.py  —  HTTP Request Parser
Breaks every incoming request into a structured dict so the Rules Engine
can inspect each part individually.
"""

import urllib.parse
import json


def parse_request(request):
    """
    Parse a raw HTTP request object into a flat dictionary of inspectable parts.

    Returns:
        {
            "method":  str,
            "path":    str,
            "query":   str,        # raw query string
            "headers": dict,
            "cookies": dict,
            "body":    str,        # raw body text
            "all_text": str        # everything concatenated for broad matching
        }
    """
    parsed = {}

    # ── Method ────────────────────────────────────────────────────────────────
    parsed["method"] = request.method.upper()

    # ── Path (URL-decoded and normalised) ─────────────────────────────────────
    raw_path = request.path or "/"
    # Decode percent-encoding twice to catch double-encoded attacks  (%252e → %2e → .)
    decoded_path = urllib.parse.unquote(urllib.parse.unquote(raw_path))
    parsed["path"] = decoded_path

    # ── Query string ──────────────────────────────────────────────────────────
    raw_query = request.query_string.decode("utf-8", errors="replace")
    decoded_query = urllib.parse.unquote(urllib.parse.unquote(raw_query))
    parsed["query"] = decoded_query

    # ── Headers (as plain text for pattern matching) ──────────────────────────
    header_dict = dict(request.headers)
    parsed["headers"] = header_dict
    parsed["headers_text"] = " ".join(f"{k}: {v}" for k, v in header_dict.items())

    # ── Cookies ───────────────────────────────────────────────────────────────
    cookie_dict = dict(request.cookies)
    parsed["cookies"] = cookie_dict
    parsed["cookies_text"] = " ".join(f"{k}={v}" for k, v in cookie_dict.items())

    # ── Request body ──────────────────────────────────────────────────────────
    body_text = ""
    content_type = request.content_type or ""

    if "application/json" in content_type:
        try:
            body_json = request.get_json(silent=True) or {}
            body_text = json.dumps(body_json)
        except Exception:
            body_text = request.get_data(as_text=True)
    else:
        # form data or raw body
        body_text = request.get_data(as_text=True)
        # also decode URL-encoded form values
        body_text = urllib.parse.unquote(urllib.parse.unquote(body_text))

    parsed["body"] = body_text

    # ── Aggregate: all inspectable text in one string ─────────────────────────
    parsed["all_text"] = " ".join([
        parsed["path"],
        parsed["query"],
        parsed["headers_text"],
        parsed["cookies_text"],
        parsed["body"],
    ])

    return parsed
