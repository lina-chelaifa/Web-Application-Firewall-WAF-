"""
rules_engine.py  —  WAF Rules Engine
Loads security rules from the database, compiles regex patterns,
and evaluates every parsed request using an anomaly scoring model.

Zero Trust principle: every request is guilty until proven innocent.
The score accumulates across all rule matches. If the total >= threshold → BLOCK.
"""

import re
from database import get_db

# ── Anomaly score threshold ───────────────────────────────────────────────────
# Any request whose total score reaches or exceeds this value will be BLOCKED.
# Tune this value: lower = stricter (more blocks), higher = more permissive.
BLOCK_THRESHOLD = int(5)

# Cache compiled regexes so we don't recompile on every request
_rule_cache = {}


def _load_rules():
    """Fetch all enabled rules from the database and compile their patterns."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, description, pattern, category, score, scope "
        "FROM waf_rules WHERE enabled = 1"
    ).fetchall()
    conn.close()

    rules = []
    for row in rows:
        try:
            compiled = re.compile(row["pattern"], re.IGNORECASE | re.DOTALL)
            rules.append({
                "id":          row["id"],
                "name":        row["name"],
                "description": row["description"],
                "pattern":     row["pattern"],
                "category":    row["category"],
                "score":       row["score"],
                "scope":       row["scope"],       # 'all', 'path', 'headers', 'body'
                "regex":       compiled,
            })
        except re.error as e:
            print(f"[ Rules Engine ] Invalid regex in rule '{row['name']}': {e}")

    return rules


def reload_rules():
    """Force a reload of rules from the database (call after rule CRUD operations)."""
    global _rule_cache
    _rule_cache = {}


def evaluate(parsed_request):
    """
    Evaluate a parsed request against all active WAF rules.

    Args:
        parsed_request (dict): output of parser.parse_request()

    Returns:
        dict: {
            "decision":      "BLOCK" | "ALLOW",
            "total_score":   int,
            "threshold":     int,
            "matched_rules": [ { name, category, score, matched_in, snippet } ]
        }
    """
    rules = _load_rules()
    matched_rules = []
    total_score   = 0

    for rule in rules:
        scope = rule["scope"]

        # Determine which parts of the request to check based on rule scope
        targets = _get_targets(parsed_request, scope)

        for field_name, field_value in targets.items():
            if not field_value:
                continue

            match = rule["regex"].search(field_value)
            if match:
                snippet = _extract_snippet(field_value, match.start(), match.end())
                matched_rules.append({
                    "name":       rule["name"],
                    "category":   rule["category"],
                    "score":      rule["score"],
                    "matched_in": field_name,
                    "snippet":    snippet,
                })
                total_score += rule["score"]
                break   # one match per rule is enough; move to next rule

    decision = "BLOCK" if total_score >= BLOCK_THRESHOLD else "ALLOW"

    return {
        "decision":      decision,
        "total_score":   total_score,
        "threshold":     BLOCK_THRESHOLD,
        "matched_rules": matched_rules,
    }


def _get_targets(parsed, scope):
    """
    Return the request fields to inspect for a given rule scope.
    'all'     → check everything
    'path'    → URL path and query string only
    'headers' → headers only (e.g. User-Agent scanner detection)
    'body'    → POST body only
    """
    if scope == "path":
        return {
            "path":  parsed.get("path", ""),
            "query": parsed.get("query", ""),
        }
    elif scope == "headers":
        return {
            "headers": parsed.get("headers_text", ""),
        }
    elif scope == "body":
        return {
            "body": parsed.get("body", ""),
        }
    else:   # 'all'
        return {
            "path":    parsed.get("path", ""),
            "query":   parsed.get("query", ""),
            "headers": parsed.get("headers_text", ""),
            "cookies": parsed.get("cookies_text", ""),
            "body":    parsed.get("body", ""),
        }


def _extract_snippet(text, start, end, context=40):
    """
    Extract a short snippet around the match for the event log.
    Never returns more than 150 characters (forensics, not reproduction).
    """
    snippet_start = max(0, start - context)
    snippet_end   = min(len(text), end + context)
    snippet = text[snippet_start:snippet_end]
    return snippet[:150]
