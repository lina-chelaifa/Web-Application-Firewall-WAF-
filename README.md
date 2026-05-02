#  Web Application Firewall (WAF)

A custom-built Web Application Firewall developed as part of a 
System Security / Zero Trust Architecture course project.

## What It Does
- Intercepts all HTTP traffic before it reaches the web application
- Detects and blocks OWASP Top 10 attacks in real time:
  SQL Injection, XSS, Path Traversal, Command Injection
- Anomaly scoring system — blocks requests scoring ≥ 5
- Admin dashboard with live event feed, statistics, and rule management
- JWT-authenticated admin panel
- IP blocklist and rate limiting

## Security Concepts Demonstrated
- Zero Trust Architecture
- Identity & Access Management (JWT)
- User Authentication (bcrypt)
- Data Security (TLS/HTTPS)
- Risk Management (anomaly scoring)

## Tech Stack
- **Backend:** Python, Flask, SQLite
- **Frontend:** React, Vite, Tailwind CSS, Recharts
- **Infrastructure:** Docker, Docker Compose, Nginx

## How to Run
1. Install Docker Desktop
2. Clone this repository
3. Run:
   docker compose up --build
4. Open: http://localhost:3000
5. Login: admin / admin123

## How to Test
Send attacks through the WAF on port 8080:

SQL Injection:
curl "http://localhost:8080/login?id=1' OR 1=1--"

XSS:
curl "http://localhost:8080/search?q=<script>alert(1)</script>"

Path Traversal:
curl "http://localhost:8080/files?path=../../etc/passwd"

All attacks return 403 Forbidden and appear in the dashboard.

## Project Structure
waf/          → Python WAF engine + REST API
dashboard/    → React admin dashboard
docker-compose.yml → runs everything together

## Academic Context
Course: System Security / Zero Trust Architecture
Year: 2024/2025
