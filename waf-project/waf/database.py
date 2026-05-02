"""
database.py  —  SQLite connection, schema creation, and seed data
Tables:
  waf_rules    — security detection rules (regex patterns + score)
  waf_events   — every request decision logged here
  waf_blocklist — banned IP addresses / CIDR ranges
  waf_admins   — admin credentials (bcrypt-hashed passwords)
"""

import sqlite3
import os
import bcrypt

DB_PATH = os.getenv("DB_PATH", "waf.db")


def get_db():
    """Open a database connection (WAL mode for concurrent reads)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # rows behave like dicts
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create all tables and seed initial data if the database is new."""
    conn = get_db()
    c = conn.cursor()

    # ── waf_rules ─────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS waf_rules (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            description TEXT    NOT NULL,
            pattern     TEXT    NOT NULL,
            category    TEXT    NOT NULL,
            score       INTEGER NOT NULL DEFAULT 5,
            scope       TEXT    NOT NULL DEFAULT 'all',
            enabled     INTEGER NOT NULL DEFAULT 1,
            created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # ── waf_events ────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS waf_events (
            id          TEXT    PRIMARY KEY,
            timestamp   TEXT    NOT NULL,
            source_ip   TEXT    NOT NULL,
            method      TEXT    NOT NULL,
            path        TEXT    NOT NULL,
            rule_name   TEXT,
            score       INTEGER NOT NULL DEFAULT 0,
            action      TEXT    NOT NULL,
            payload     TEXT,
            user_agent  TEXT,
            status_code INTEGER
        )
    """)

    # ── waf_blocklist ─────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS waf_blocklist (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ip         TEXT    NOT NULL UNIQUE,
            reason     TEXT,
            added_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # ── waf_admins ────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS waf_admins (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    conn.commit()

    # ── Seed default admin (admin / admin123) ─────────────────────────────────
    existing = c.execute(
        "SELECT id FROM waf_admins WHERE username = 'admin'"
    ).fetchone()
    if not existing:
        pw_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
        c.execute(
            "INSERT INTO waf_admins (username, password_hash) VALUES (?, ?)",
            ("admin", pw_hash)
        )
        conn.commit()
        print("[ DB ] Default admin created  →  username: admin  |  password: admin123")

    # ── Seed default security rules ───────────────────────────────────────────
    count = c.execute("SELECT COUNT(*) FROM waf_rules").fetchone()[0]
    if count == 0:
        _seed_rules(c)
        conn.commit()
        print("[ DB ] Default WAF rules seeded.")

    conn.close()


def _seed_rules(c):
    rules = [
        # ── SQL Injection ──────────────────────────────────────────────────────
        ("SQLi_UNION_SELECT",   "SQL UNION SELECT injection",
         r"(?i)(union[\s\+]+select)",             "SQLi", 5, "all"),
        ("SQLi_OR_1_EQ_1",      "Classic OR 1=1 injection",
         r"(?i)(\bor\b\s+\d+=\d+)",              "SQLi", 5, "all"),
        ("SQLi_DROP_TABLE",     "DROP TABLE statement",
         r"(?i)(drop\s+table)",                   "SQLi", 5, "all"),
        ("SQLi_COMMENT",        "SQL inline comment evasion",
         r"(--|#|/\*)",                            "SQLi", 3, "all"),
        ("SQLi_SLEEP",          "Time-based blind SQL injection",
         r"(?i)(sleep\s*\(|benchmark\s*\()",      "SQLi", 5, "all"),
        ("SQLi_QUOTE_LOGIC",    "Quote with boolean logic",
         r"'(\s)*(or|and)(\s)*'",                 "SQLi", 4, "all"),

        # ── Cross-Site Scripting (XSS) ────────────────────────────────────────
        ("XSS_SCRIPT_TAG",      "Script tag injection",
         r"(?i)(<script[\s>])",                   "XSS",  5, "all"),
        ("XSS_ON_EVENT",        "Inline event handler injection",
         r"(?i)(on(load|error|click|focus|mouse)\s*=)", "XSS", 5, "all"),
        ("XSS_JAVASCRIPT_URI",  "javascript: URI scheme",
         r"(?i)(javascript\s*:)",                 "XSS",  5, "all"),
        ("XSS_EVAL",            "eval() or document.cookie access",
         r"(?i)(eval\s*\(|document\.cookie)",     "XSS",  4, "all"),

        # ── Path Traversal ─────────────────────────────────────────────────────
        ("PATH_TRAVERSAL",      "Directory traversal sequences",
         r"(\.\.[\\/]){2,}",                      "PathTraversal", 4, "path"),
        ("PATH_ETC_PASSWD",     "Access to /etc/passwd",
         r"(?i)(/etc/passwd|/etc/shadow)",        "PathTraversal", 5, "path"),
        ("PATH_WINDOWS_SYS",    "Access to Windows system files",
         r"(?i)(win\.ini|system32)",              "PathTraversal", 4, "path"),

        # ── Command Injection ──────────────────────────────────────────────────
        ("CMD_SHELL_OP",        "Shell operator injection",
         r"(;|\|{1,2}|&&|`)\s*(ls|cat|whoami|id|uname|pwd|wget|curl)", "CmdInjection", 5, "all"),
        ("CMD_BACKTICK",        "Backtick command substitution",
         r"`[^`]+`",                              "CmdInjection", 4, "all"),

        # ── Protocol / Scanner Detection ──────────────────────────────────────
        ("SCANNER_SQLMAP",      "sqlmap scanner detected",
         r"(?i)(sqlmap)",                         "Scanner", 3, "headers"),
        ("SCANNER_NIKTO",       "Nikto scanner detected",
         r"(?i)(nikto)",                          "Scanner", 3, "headers"),
        ("SCANNER_DIRBUSTER",   "DirBuster scanner detected",
         r"(?i)(dirbuster|gobuster|dirb)",        "Scanner", 3, "headers"),
    ]

    c.executemany("""
        INSERT OR IGNORE INTO waf_rules
          (name, description, pattern, category, score, scope)
        VALUES (?, ?, ?, ?, ?, ?)
    """, rules)
