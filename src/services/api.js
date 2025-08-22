// C:/Users/umut/OneDrive/Desktop/BUTCE/frontend/src/services/api.js
// Bu dosyada SADECE rapor uçları var. Aynı isimli fonksiyonları başka dosyalarda TANIMLAMA.

// .env: VITE_API_BASE_URL=http://localhost:5000  → buradan /api ekliyoruz
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";

// JWT header
function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Basit fetch helper
async function httpGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeader() });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || `GET ${path} failed (${res.status})`);
  }
  return res.json();
}

async function safeText(res) {
  try {
    const t = await res.text();
    return t;
  } catch {
    return "";
  }
}

/* -----------------------------
   REPORTS API (kullanılanlar)
--------------------------------*/

// Özet kartlar
export async function getReportSummary(from, to) {
  const q = new URLSearchParams({ from, to }).toString();
  return httpGet(`/reports/summary?${q}`);
}

// Satışçı kırılımı
export async function getReportBySalesperson(from, to) {
  const q = new URLSearchParams({ from, to }).toString();
  return httpGet(`/reports/by-salesperson?${q}`);
}

// NOT: Bu dosyada AYNI isimde fonksiyonları ikinci kez tanımlama!
// Eğer daha önce bu fonksiyonları yukarıya kopyaladıysan, onları sil.
