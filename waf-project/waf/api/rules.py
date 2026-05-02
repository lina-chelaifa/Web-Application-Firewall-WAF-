"""
api/rules.py  —  WAF Rules Management API
Full CRUD for security rules. All endpoints require JWT authentication.
After any change, the rule cache is cleared so the engine picks up new rules.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import get_db
from rules_engine import reload_rules
import re

rules_bp = Blueprint("rules", __name__)

@rules_bp.route("/", methods=["GET"])
@jwt_required()
def list_rules():
    conn = get_db()
    rows = conn.execute("SELECT * FROM waf_rules ORDER BY category, name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200


@rules_bp.route("/", methods=["POST"])
@jwt_required()
def create_rule():
    data = request.get_json(silent=True) or {}
    required = ["name", "description", "pattern", "category", "score"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    # Validate regex before saving
    try:
        re.compile(data["pattern"])
    except re.error as e:
        return jsonify({"error": f"Invalid regex pattern: {e}"}), 400

    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO waf_rules (name, description, pattern, category, score, scope, enabled)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        """, (data["name"], data["description"], data["pattern"],
              data["category"], int(data["score"]), data.get("scope", "all")))
        conn.commit()
        reload_rules()
        return jsonify({"message": "Rule created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 409
    finally:
        conn.close()


@rules_bp.route("/<int:rule_id>", methods=["PUT"])
@jwt_required()
def update_rule(rule_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    row  = conn.execute("SELECT id FROM waf_rules WHERE id = ?", (rule_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Rule not found"}), 404

    # Build dynamic update
    fields, values = [], []
    for col in ["name","description","pattern","category","score","scope","enabled"]:
        if col in data:
            if col == "pattern":
                try:
                    re.compile(data[col])
                except re.error as e:
                    conn.close()
                    return jsonify({"error": f"Invalid regex: {e}"}), 400
            fields.append(f"{col} = ?")
            values.append(data[col])

    if not fields:
        conn.close()
        return jsonify({"error": "No valid fields to update"}), 400

    values.append(rule_id)
    conn.execute(f"UPDATE waf_rules SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    reload_rules()
    return jsonify({"message": "Rule updated"}), 200


@rules_bp.route("/<int:rule_id>", methods=["DELETE"])
@jwt_required()
def delete_rule(rule_id):
    conn = get_db()
    conn.execute("DELETE FROM waf_rules WHERE id = ?", (rule_id,))
    conn.commit()
    conn.close()
    reload_rules()
    return jsonify({"message": "Rule deleted"}), 200
