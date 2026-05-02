"""
api/events.py  —  WAF Events API
GET /api/events        — paginated list of all WAF decisions
GET /api/events/<id>   — full detail of one event
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db

events_bp = Blueprint("events", __name__)

@events_bp.route("/", methods=["GET"])
@jwt_required()
def list_events():
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    action   = request.args.get("action")       # optional filter: BLOCK / ALLOW
    offset   = (page - 1) * per_page

    conn  = get_db()
    query = "SELECT * FROM waf_events"
    args  = []
    if action:
        query += " WHERE action = ?"
        args.append(action.upper())
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    args  += [per_page, offset]

    rows  = conn.execute(query, args).fetchall()
    total = conn.execute("SELECT COUNT(*) FROM waf_events").fetchone()[0]
    conn.close()

    return jsonify({
        "total":   total,
        "page":    page,
        "events":  [dict(r) for r in rows],
    }), 200


@events_bp.route("/<event_id>", methods=["GET"])
@jwt_required()
def get_event(event_id):
    conn = get_db()
    row  = conn.execute("SELECT * FROM waf_events WHERE id = ?", (event_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(dict(row)), 200
