// !!! BU DOSYADA JSX OLMAYACAK !!!
// Sadece fetch yardımcıları (Bearer token) — cookie yok, credentials yok.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/** path -> tam URL
 * - http/https ise dokunma
 * - /api ile başlıyorsa BASE_URL + path
 * - değilse BASE_URL + /api + path
 */
function buildUrl(path) {
  if (!path) return `${BASE_URL}/api`;
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/api" || clean.startsWith("/api/")) return `${BASE_URL}${clean}`;
  return `${BASE_URL}/api${clean}`;
}

function withAuthHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const error = new Error((data && (data.message || data.error)) || `HTTP ${res.status} ${res.statusText}`);
    error.response = { status: res.status, statusText: res.statusText, data };
    throw error;
  }
  return { ok: true, status: res.status, data };
}

// Çekirdek
export async function get(path) {
  const res = await fetch(buildUrl(path), { method: "GET", headers: withAuthHeaders() });
  return handleResponse(res);
}
export async function post(path, body = {}) {
  const res = await fetch(buildUrl(path), { method: "POST", headers: withAuthHeaders(), body: JSON.stringify(body) });
  return handleResponse(res);
}
export async function put(path, body = {}) {
  const res = await fetch(buildUrl(path), { method: "PUT", headers: withAuthHeaders(), body: JSON.stringify(body) });
  return handleResponse(res);
}
export async function del(path) {
  const res = await fetch(buildUrl(path), { method: "DELETE", headers: withAuthHeaders() });
  return handleResponse(res);
}

// Senin import’larınla uyum için alias'lar
export const apiGet = get;
export const apiPost = post;
export const apiPut = put;
export const apiDelete = del;

export default { get, post, put, del, apiGet, apiPost, apiPut, apiDelete };
