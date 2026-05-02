"""
proxy.py  —  WAF Reverse Proxy Server
The main request processing pipeline.
Every HTTP/HTTPS request passes through here in order:
  1. Receive request
  2. IP & rate-limit check
  3. Parse request
  4. Run rules engine
  5. BLOCK (return 403) or ALLOW (forward to origin)
  6. Log the decision
"""

import os
import uuid
import requests as req_lib
from flask import Flask, request, jsonify, Response

from parser       import parse_request
from rules_engine import evaluate
from ip_filter    import is_blocked
from logger       import log_event

ORIGIN_URL   = os.getenv("ORIGIN_URL", "http://localhost:80")
PROXY_HOST   = "0.0.0.0"
PROXY_PORT   = int(os.getenv("PROXY_PORT", 8080))


def create_proxy_app(flask_app):
    """
    Create a separate Flask app that acts as the WAF proxy.
    Receives all traffic, inspects it, then forwards or blocks.
    """
    proxy = Flask("waf_proxy")

    @proxy.route("/", defaults={"path": ""}, methods=["GET","POST","PUT","DELETE","PATCH","HEAD","OPTIONS"])
    @proxy.route("/<path:path>",             methods=["GET","POST","PUT","DELETE","PATCH","HEAD","OPTIONS"])
    def intercept(path):
        """Entry point for every request passing through the WAF."""

        source_ip  = request.headers.get("X-Forwarded-For", request.remote_addr)
        user_agent = request.headers.get("User-Agent", "")

        # ── CHECKPOINT 1: IP / Rate-limit check ───────────────────────────────
        blocked, reason = is_blocked(source_ip)
        if blocked:
            event_id = log_event(
                source_ip   = source_ip,
                method      = request.method,
                path        = request.path,
                rule_name   = "IP_FILTER",
                score       = 999,
                action      = "BLOCK",
                payload     = reason,
                user_agent  = user_agent,
                status_code = 403,
                flask_app   = flask_app,
            )
            return _block_response(event_id, reason), 403

        # ── CHECKPOINT 2: Parse the request ───────────────────────────────────
        parsed = parse_request(request)

        # ── CHECKPOINT 3: Rules Engine evaluation ─────────────────────────────
        result = evaluate(parsed)

        top_rule    = result["matched_rules"][0]["name"] if result["matched_rules"] else None
        top_snippet = result["matched_rules"][0]["snippet"] if result["matched_rules"] else None

        # ── DECISION: BLOCK ───────────────────────────────────────────────────
        if result["decision"] == "BLOCK":
            event_id = log_event(
                source_ip   = source_ip,
                method      = request.method,
                path        = request.path,
                rule_name   = top_rule,
                score       = result["total_score"],
                action      = "BLOCK",
                payload     = top_snippet,
                user_agent  = user_agent,
                status_code = 403,
                flask_app   = flask_app,
            )
            return _block_response(event_id, "Request blocked by WAF security policy"), 403

        # ── DECISION: ALLOW → forward to origin ───────────────────────────────
        request_id = str(uuid.uuid4())[:12]
        try:
            forward_headers = _build_forward_headers(request, source_ip, request_id, result["total_score"])
            origin_response = req_lib.request(
                method  = request.method,
                url     = ORIGIN_URL + request.full_path,
                headers = forward_headers,
                data    = request.get_data(),
                cookies = request.cookies,
                timeout = 10,
                allow_redirects = False,
                verify  = False,
            )

            log_event(
                source_ip   = source_ip,
                method      = request.method,
                path        = request.path,
                rule_name   = None,
                score       = result["total_score"],
                action      = "ALLOW",
                user_agent  = user_agent,
                status_code = origin_response.status_code,
                flask_app   = flask_app,
            )

            # Relay origin response back to client
            excluded_headers = {"content-encoding", "transfer-encoding", "connection"}
            response_headers = {
                k: v for k, v in origin_response.headers.items()
                if k.lower() not in excluded_headers
            }
            return Response(
                origin_response.content,
                status  = origin_response.status_code,
                headers = response_headers,
            )

        except req_lib.exceptions.ConnectionError:
            return jsonify({"error": "Origin server unavailable"}), 502
        except req_lib.exceptions.Timeout:
            return jsonify({"error": "Origin server timed out"}), 504

    return proxy


def start_proxy_server(flask_app):
    """Start the WAF proxy Flask app in its own thread."""
    proxy_app = create_proxy_app(flask_app)
    proxy_app.run(host=PROXY_HOST, port=PROXY_PORT, debug=False, use_reloader=False)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _block_response(event_id, message):
    """Return a structured JSON 403 response. Never expose rule details to the client."""
    return jsonify({
        "error":     "Forbidden",
        "code":      403,
        "message":   message,
        "reference": event_id,
        "info":      "If you believe this is a mistake, contact the administrator with your reference ID.",
    })


def _build_forward_headers(request, source_ip, request_id, score):
    """
    Build the headers to send to the origin server.
    Strip hop-by-hop headers and inject WAF tracing headers.
    """
    hop_by_hop = {"host","connection","keep-alive","proxy-authenticate",
                  "proxy-authorization","te","trailers","transfer-encoding","upgrade"}
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in hop_by_hop
    }
    headers["X-Forwarded-For"]  = source_ip
    headers["X-WAF-Request-ID"] = request_id
    headers["X-WAF-Score"]      = str(score)
    headers["Host"]             = ORIGIN_URL.split("//")[-1]
    return headers
