# 🛡️ Web Application Firewall (WAF) — Executable Deliverable

A fully functional, custom-built WAF built from scratch as part of the System Security / Zero Trust Architecture course project.

---

## 📁 Project Structure

```
waf-project/
├── waf/                      ← Python WAF Engine + Admin REST API
│   ├── app.py                ← Main entry point
│   ├── proxy.py              ← HTTP reverse proxy (intercepts all requests)
│   ├── parser.py             ← Breaks HTTP requests into inspectable parts
│   ├── rules_engine.py       ← Anomaly scoring + threat detection
│   ├── ip_filter.py          ← IP blocklist + rate limiter
│   ├── logger.py             ← Async event logging to SQLite
│   ├── database.py           ← SQLite schema + seed data
│   ├── api/
│   │   ├── auth.py           ← POST /api/auth/login (JWT)
│   │   ├── events.py         ← GET /api/events/
│   │   ├── rules.py          ← CRUD /api/rules/
│   │   ├── stats.py          ← GET /api/stats/
│   │   └── blocklist.py      ← POST/DELETE /api/blocklist/
│   ├── requirements.txt
│   └── Dockerfile
├── dashboard/                ← React Admin Dashboard
│   ├── src/
│   │   ├── App.jsx           ← Routing + layout
│   │   ├── api.js            ← Axios + JWT token management
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Events.jsx    ← Live event feed
│   │       ├── Stats.jsx     ← Charts + KPIs
│   │       ├── Rules.jsx     ← Rule CRUD
│   │       └── Blocklist.jsx ← IP blocklist
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml        ← Run everything with one command
└── README.md
```

---

## 🚀 Quick Start (Recommended: Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run the entire system with one command:
```bash
cd waf-project
docker compose up --build
```

### Then open:
| Service | URL | Description |
|---|---|---|
| **WAF Proxy** | `http://localhost:8080` | Send your traffic through here |
| **Admin Dashboard** | `http://localhost:3000` | Login with `admin` / `admin123` |
| **Admin API** | `http://localhost:5000` | REST API (JWT required) |
| **DVWA (target)** | `http://localhost:8888` | Vulnerable app WITHOUT WAF (for comparison) |

---

## 🛠️ Manual Setup (Without Docker)

### Step 1 — Set up the Python WAF Engine

```bash
cd waf-project/waf

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate          # Linux / Mac
venv\Scripts\activate             # Windows

# Install dependencies
pip install -r requirements.txt

# Copy the environment config
cp ../.env.example .env
# Edit .env if needed (default values work for local testing)

# Run the WAF
python app.py
```

You should see:
```
[ WAF ] Initializing database...
[ DB ] Default admin created  →  username: admin  |  password: admin123
[ DB ] Default WAF rules seeded.
[ WAF ] Starting WAF proxy on port 8080...
[ WAF ] Starting Admin API on port 5000...
```

### Step 2 — Set up the React Dashboard

```bash
cd waf-project/dashboard

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 🧪 Testing the WAF — Attack Simulations

### Test 1: SQL Injection (should be BLOCKED)
```bash
curl "http://localhost:8080/login?id=1' OR 1=1--"
```
**Expected response:**
```json
{ "error": "Forbidden", "code": 403, "message": "Request blocked by WAF security policy." }
```

### Test 2: XSS Attack (should be BLOCKED)
```bash
curl "http://localhost:8080/search?q=<script>alert('xss')</script>"
```
**Expected:** 403 Forbidden

### Test 3: Path Traversal (should be BLOCKED)
```bash
curl "http://localhost:8080/files?path=../../etc/passwd"
```
**Expected:** 403 Forbidden

### Test 4: Command Injection (should be BLOCKED)
```bash
curl "http://localhost:8080/ping?host=127.0.0.1; cat /etc/passwd"
```
**Expected:** 403 Forbidden

### Test 5: Clean request (should be ALLOWED)
```bash
curl "http://localhost:8080/"
```
**Expected:** Normal response from the origin server

### Test 6: Rate limiting (should be BLOCKED after 100 requests/min)
```bash
# Linux/Mac: send 110 rapid requests
for i in {1..110}; do curl -s "http://localhost:8080/" > /dev/null; done
# The last requests should receive 403
```

### Test 7: Admin API authentication
```bash
# Login and get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use the token to fetch events (replace TOKEN with your actual token)
curl http://localhost:5000/api/events/ \
  -H "Authorization: Bearer TOKEN"

# Try without token — should get 401 Unauthorized
curl http://localhost:5000/api/events/
```

### Test 8: Using sqlmap (advanced)
```bash
# Install sqlmap: pip install sqlmap  OR  download from sqlmap.org
sqlmap -u "http://localhost:8080/login?id=1" --level=3 --risk=2

# Expected: sqlmap finds no vulnerabilities because the WAF blocks all payloads
# Check the Admin Dashboard — you will see all sqlmap attempts logged as BLOCK
```

### Test 9: Using OWASP ZAP (graphical)
1. Download OWASP ZAP from https://www.zaproxy.org/download/
2. Set target to `http://localhost:8080`
3. Run "Automated Scan"
4. Compare findings with scanning `http://localhost:8888` (DVWA without WAF)
5. The WAF-protected target should show far fewer exploitable vulnerabilities

---

## 📊 Admin Dashboard Features

| Page | What You Can Do |
|---|---|
| **Live Events** | See all requests in real time. Filter by BLOCK/ALLOW. Auto-refreshes every 5s. |
| **Statistics** | Bar charts of top blocked rules. Top attacking IPs. Hourly traffic line chart. KPI cards. |
| **Rules** | View all 17 built-in rules. Enable/disable rules. Add custom rules with regex. Delete rules. |
| **IP Blocklist** | View blocked IPs. Add an IP with a reason. Remove (unblock) an IP. |

---

## 🔒 Security Concepts Demonstrated

| Concept | Where in the Code |
|---|---|
| **Zero Trust** | `proxy.py` — every request inspected regardless of source |
| **User Authentication** | `api/auth.py` — bcrypt password hashing + JWT tokens |
| **Identity & Access Management** | All `/api/*` routes require valid JWT (`@jwt_required()`) |
| **Data Security** | TLS support, payload snippets limited to 200 chars in logs |
| **Risk Management** | `rules_engine.py` — tunable anomaly scoring threshold |
| **Anomaly Detection** | Score accumulation across multiple rule matches |
| **Audit Trail** | `logger.py` — every request logged asynchronously to SQLite |

---

## 🛠️ Default Security Rules (17 rules seeded at startup)

| Category | Rules |
|---|---|
| SQL Injection | UNION SELECT, OR 1=1, DROP TABLE, SQL comments, SLEEP(), quote+logic |
| XSS | Script tags, inline event handlers, javascript: URI, eval() |
| Path Traversal | ../ sequences, /etc/passwd, Windows system files |
| Command Injection | Shell operators (;, \|, &&), backtick substitution |
| Scanner Detection | sqlmap, nikto, dirbuster/gobuster User-Agent signatures |

---

## ⚙️ Tuning the WAF

**Make it stricter** (block more): lower `BLOCK_THRESHOLD` in `.env` (e.g., to `3`)

**Make it more permissive** (fewer false alarms): raise threshold (e.g., to `8`)

**Add a custom rule** via the Admin Dashboard → Rules → Add Rule:
- Name: `CUSTOM_MY_RULE`
- Pattern: your regex
- Score: 5
- Category: Custom

---

## 📝 Important Notes for Demo

1. **Start the WAF first**, then send attacks — events appear live in the dashboard.
2. **Two browser tabs**: one showing the Admin Dashboard, one sending attack curl commands.
3. **Compare**: attack `localhost:8080` (WAF ON) vs `localhost:8888` (WAF OFF / DVWA direct).
4. **Show the Events page** during the demo — the dashboard updates in real time as attacks are blocked.
