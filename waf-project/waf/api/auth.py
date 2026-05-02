"""
api/auth.py  —  Admin Authentication API
Implements secure login using bcrypt password verification and JWT tokens.

Concepts demonstrated:
  - User Authentication (password hashing with bcrypt)
  - Identity & Access Management (JWT-based stateless auth)
  - Zero Trust (every subsequent API call must present a valid token)
"""

import bcrypt
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from database import get_db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: { "username": "admin", "password": "admin123" }
    Returns: { "token": "<jwt>" } on success
             { "error": "..." }  on failure
    """
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    # Fetch admin record from database
    conn = get_db()
    admin = conn.execute(
        "SELECT * FROM waf_admins WHERE username = ?", (username,)
    ).fetchone()
    conn.close()

    if not admin:
        # Constant-time response to prevent username enumeration
        bcrypt.checkpw(b"dummy", b"$2b$12$eImiTXuWVxfM37uY4JANjQ==")
        return jsonify({"error": "Invalid credentials"}), 401

    # Verify password against bcrypt hash
    password_matches = bcrypt.checkpw(
        password.encode("utf-8"),
        admin["password_hash"].encode("utf-8")
    )

    if not password_matches:
        return jsonify({"error": "Invalid credentials"}), 401

    # Generate JWT token
    token = create_access_token(identity=username)

    return jsonify({
        "token":    token,
        "username": username,
        "message":  "Login successful",
    }), 200


@auth_bp.route("/verify", methods=["GET"])
def verify():
    """
    GET /api/auth/verify
    Quick endpoint the dashboard can use to check if a stored token is still valid.
    Protected — requires Authorization: Bearer <token> header.
    """
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        return jsonify({"valid": True, "username": identity}), 200
    except Exception:
        return jsonify({"valid": False}), 401
