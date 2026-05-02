"""
api/stats.py  —  WAF Statistics API
Aggregated metrics for the Admin Dashboard charts.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from database import get_db

stats_bp = Blueprint("stats", __name__)

@stats_bp.route("/", methods=["GET"])
@jwt_required()
def get_stats():
    conn = get_db()

    total        = conn.execute("SELECT COUNT(*) FROM waf_events").fetchone()[0]
    total_block  = conn.execute("SELECT COUNT(*) FROM waf_events WHERE action='BLOCK'").fetchone()[0]
    total_allow  = conn.execute("SELECT COUNT(*) FROM waf_events WHERE action='ALLOW'").fetchone()[0]
    block_rate   = round((total_block / total * 100), 2) if total > 0 else 0

    # Top attacking IPs
    top_ips = conn.execute("""
        SELECT source_ip, COUNT(*) as count FROM waf_events
        WHERE action='BLOCK' GROUP BY source_ip ORDER BY count DESC LIMIT 10
    """).fetchall()

    # Attacks by category
    by_category = conn.execute("""
        SELECT rule_name, COUNT(*) as count FROM waf_events
        WHERE action='BLOCK' AND rule_name IS NOT NULL
        GROUP BY rule_name ORDER BY count DESC LIMIT 10
    """).fetchall()

    # Requests over last 24 hours (hourly buckets)
    hourly = conn.execute("""
        SELECT strftime('%H:00', timestamp) as hour, COUNT(*) as count
        FROM waf_events
        WHERE timestamp >= datetime('now', '-24 hours')
        GROUP BY hour ORDER BY hour
    """).fetchall()

    conn.close()
    return jsonify({
        "total":        total,
        "total_block":  total_block,
        "total_allow":  total_allow,
        "block_rate":   block_rate,
        "top_ips":      [dict(r) for r in top_ips],
        "by_category":  [dict(r) for r in by_category],
        "hourly":       [dict(r) for r in hourly],
    }), 200
