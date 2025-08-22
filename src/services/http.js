const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function apiGet(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    }
  });
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return await res.json();
}

export async function apiPost(path, body) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      "Cache-Control": "no-cache",
      Pragma: "no-cache"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return await res.json();
}
