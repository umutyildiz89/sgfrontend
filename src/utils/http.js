// C:/Users/umut/OneDrive/Desktop/BUTCE/frontend/src/utils/http.js
// Tüm istekler backend'e (5000) gitsin.

// .env'de: VITE_API_BASE_URL=http://localhost:5000  (sende bu var)
// Biz burada /api eklemesini merkezi yapıyoruz:
const API_ROOT =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_BASE = `${API_ROOT}/api`;

function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handleResponse(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  const data = ct.includes("application/json") ? (text ? JSON.parse(text) : null) : text;

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `${res.status} ${res.statusText || "Hata"}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// PATH KULLANIMI ÖNEMLİ:
// Buraya "/auth/login", "/customers", "/reports/summary" gibi **/api'siz** gönder.
export async function get(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  return handleResponse(res);
}

export async function post(path, body, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options.headers || {}) },
    body: body != null ? JSON.stringify(body) : null,
  });
  return handleResponse(res);
}

export async function put(path, body, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options.headers || {}) },
    body: body != null ? JSON.stringify(body) : null,
  });
  return handleResponse(res);
}

export async function del(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  return handleResponse(res);
}

// KOLAY ALIASES (mevcut kullanım uyumu için)
export const apiGet = get;
export const apiPost = post;
export const apiPut = put;
export const apiDelete = del;
