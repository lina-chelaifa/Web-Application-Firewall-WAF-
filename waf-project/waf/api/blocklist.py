"""
api/blocklist.py  —  IP Blocklist Management API
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db

blocklist_bp = Blueprint("blocklist", __name__)

@blocklist_bp.route("/", methods=["GET"])
@jwt_required()
def list_blocked():
    conn = get_db()
    rows = conn.execute("SELECT * FROM waf_blocklist ORDER BY added_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200

@blocklist_bp.route("/", methods=["POST"])
@jwt_required()
def add_ip():
    data   = request.get_json(silent=True) or {}
    ip     = data.get("ip", "").strip()
    reason = data.get("reason", "Manually blocked by admin")
    if not ip:
        return jsonify({"error": "IP address is required"}), 400
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO waf_blocklist (ip, reason) VALUES (?, ?)", (ip, reason)
        )
        conn.commit()
        return jsonify({"message": f"{ip} added to blocklist"}), 201
    except Exception:
        return jsonify({"error": "IP already in blocklist"}), 409
    finally:
        conn.close()

@blocklist_bp.route("/<path:ip>", methods=["DELETE"])
@jwt_required()
def remove_ip(ip):
    conn = get_db()
    conn.execute("DELETE FROM waf_blocklist WHERE ip = ?", (ip,))
    conn.commit()
    conn.close()
    return jsonify({"message": f"{ip} removed from blocklist"}), 200
