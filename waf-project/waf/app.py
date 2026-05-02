"""
WAF - Web Application Firewall
Main entry point: starts the HTTPS reverse proxy + Admin REST API
"""

import os
import ssl
import threading
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from database import init_db
from proxy import start_proxy_server
from api.auth      import auth_bp
from api.events    import events_bp
from api.rules     import rules_bp
from api.stats     import stats_bp
from api.blocklist import blocklist_bp

load_dotenv()

# ── Flask Admin API app ───────────────────────────────────────────────────────
app = Flask(__name__)
app.config["JWT_SECRET_KEY"]       = os.getenv("JWT_SECRET", "change-me-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False   # tokens valid until server restart (dev)

jwt = JWTManager(app)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Register API blueprints
app.register_blueprint(auth_bp,      url_prefix="/api/auth")
app.register_blueprint(events_bp,    url_prefix="/api/events")
app.register_blueprint(rules_bp,     url_prefix="/api/rules")
app.register_blueprint(stats_bp,     url_prefix="/api/stats")
app.register_blueprint(blocklist_bp, url_prefix="/api/blocklist")

# Make socketio accessible to logger
app.socketio = socketio

# ── Startup ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[ WAF ] Initializing database...")
    init_db()

    print("[ WAF ] Starting WAF proxy on port 8080 (HTTP) and 8443 (HTTPS)...")
    proxy_thread = threading.Thread(
        target=start_proxy_server,
        args=(app,),
        daemon=True
    )
    proxy_thread.start()

    print("[ WAF ] Starting Admin API on port 5000...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
