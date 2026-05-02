// api.js — Axios instance with automatic JWT injection
import axios from "axios";

const BASE_URL = "http://localhost:5000";

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken   = ()    => localStorage.getItem("waf_token");
export const setToken   = (tok) => localStorage.setItem("waf_token", tok);
export const clearToken = ()    => localStorage.removeItem("waf_token");

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL });

// Automatically attach JWT to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── API calls ──────────────────────────────────────────────────────────────────
export const login        = (username, password) =>
  api.post("/api/auth/login", { username, password });

export const fetchEvents  = (page = 1, action = "") =>
  api.get("/api/events/", { params: { page, per_page: 50, action } });

export const fetchStats   = () => api.get("/api/stats/");

export const fetchRules   = () => api.get("/api/rules/");
export const createRule   = (data) => api.post("/api/rules/", data);
export const updateRule   = (id, data) => api.put(`/api/rules/${id}`, data);
export const deleteRule   = (id) => api.delete(`/api/rules/${id}`);

export const fetchBlocklist = () => api.get("/api/blocklist/");
export const addToBlocklist = (ip, reason) => api.post("/api/blocklist/", { ip, reason });
export const removeFromBlocklist = (ip) => api.delete(`/api/blocklist/${encodeURIComponent(ip)}`);

export default api;
