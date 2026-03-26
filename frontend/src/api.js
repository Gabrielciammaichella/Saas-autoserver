// frontend/src/api.js
const RAW_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
// Normaliza para que NO termine en "/"
const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

export function getToken() {
  const t = localStorage.getItem("token");
  const cleaned = t ? t.trim() : "";
  return cleaned || null;
}

export function setToken(token) {
  const t = String(token ?? "").trim();
  if (!t) return; // no guardes basura
  localStorage.setItem("token", t);
}

export function clearToken() {
  localStorage.removeItem("token");
}

function buildUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};

  // Solo seteamos content-type si mandamos body
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Si no te pasan token explícito, usamos el de localStorage
  const t = String((token ?? getToken()) || "").trim();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text; // por si vino texto plano
  }

  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (data && data.msg) ||
      (typeof data === "string" ? data : null) ||
      `HTTP ${res.status}`;

    // Si el token está inválido/expiró, lo limpiamos
    if (res.status === 401 || res.status === 422) clearToken();

    throw new Error(msg);
  }

  return data;
}

/* AUTH */
export function register(email, password) {
  return request("/api/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

/* ME (plan actual / user actual) */
export function getMe(token) {
  return request("/api/me", { token });
}

/* MONITORS */
export function listMonitors(token) {
  return request("/api/monitors", { token });
}

export function createMonitor(token, { name, url, interval_seconds }) {
  return request("/api/monitors", {
    method: "POST",
    token,
    body: { name, url, interval_seconds },
  });
}

export function deleteMonitor(token, id) {
  return request(`/api/monitors/${id}`, {
    method: "DELETE",
    token,
  });
}

/* BILLING (Upgrade) */
// Endpoint: POST /api/billing/upgrade
export function upgradeToPro(token) {
  return request("/api/billing/upgrade", {
    method: "POST",
    token,
  });
}
