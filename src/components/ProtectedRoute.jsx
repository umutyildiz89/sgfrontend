// frontend/src/components/ProtectedRoute.jsx
import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * API tabanı (Vite .env ile override edilebilir)
 * VITE_API_BASE="http://localhost:5000"
 */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

/**
 * Rol adlarını tek tipe indir (canonical):
 * - "Operasyon Müdürü" -> "OPERASYON_MUDURU"
 * - "Genel Müdür"      -> "GENEL_MUDUR"
 * - Zaten canonical ise dokunma
 */
const CANON_MAP = {
  "Operasyon Müdürü": "OPERASYON_MUDURU",
  "Genel Müdür": "GENEL_MUDUR",
  OPERASYON_MUDURU: "OPERASYON_MUDURU",
  GENEL_MUDUR: "GENEL_MUDUR",
};

function toAsciiTr(s) {
  return s
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[ıİ]/g, "i");
}

function normalizeRole(r) {
  if (!r) return "";
  const direct = CANON_MAP[r];
  if (direct) return direct;

  // "Operasyon Muduru" / "genel mudur" gibi varyasyonları yakala
  let s = String(r).trim();
  s = toAsciiTr(s).replace(/\s+/g, "_").toUpperCase(); // "Operasyon Müdürü" -> "OPERASYON_MUDURU"
  return CANON_MAP[s] || s;
}

/**
 * Basit JWT decode (yalnızca payload'ı çözer)
 */
function decodeJWT(token) {
  try {
    const payload = token.split(".")[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    // URI decode guard (bazı ortamlar unicode içerebilir)
    try {
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return JSON.parse(json);
    }
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking"); // checking | ok | noauth
  const [role, setRole] = useState("");

  // Token'ı her render'da okuyalım (login/logout sonrası güncellenir)
  const token = useMemo(() => localStorage.getItem("token") || "", []);

  useEffect(() => {
    async function run() {
      // 1) Token yoksa login'e
      const t = localStorage.getItem("token");
      if (!t) {
        setStatus("noauth");
        return;
      }

      // 2) JWT içinden rol bulmayı dene
      let foundRole = "";
      const p = decodeJWT(t);
      if (p) {
        foundRole = p.role || p?.claims?.role || "";
      }

      // 3) Eğer JWT boş ise /api/users/me ile getir
      if (!foundRole) {
        try {
          const meRes = await fetch(`${API_BASE}/api/users/me`, {
            headers: { Authorization: `Bearer ${t}` },
          });
          if (meRes.status === 401) {
            // token geçersiz -> temizleyip login'e
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            setStatus("noauth");
            return;
          }
          if (meRes.ok) {
            const me = await meRes.json();
            foundRole = me?.role || "";
          }
        } catch {
          // ağ hatası durumunda yedek olarak storage'daki role'ü kullan
          foundRole =
            foundRole ||
            localStorage.getItem("role") ||
            sessionStorage.getItem("role") ||
            "";
        }
      }

      // 4) Normalize et
      const normalized = normalizeRole(
        foundRole ||
          localStorage.getItem("role") ||
          sessionStorage.getItem("role") ||
          ""
      );

      // 5) State'e yaz
      setRole(normalized);
      setStatus("ok");
    }

    run();
  }, []);

  // Yüklenirken küçük bir boşluk bırak (isteğe göre spinner basabilirsin)
  if (status === "checking") return null;

  // Auth yoksa login'e yönlendir
  if (status === "noauth") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // Yetki kontrolü
  if (allowedRoles.length > 0) {
    const ok = allowedRoles.includes(role);
    if (!ok) {
      // 403 -> anasayfaya ya da uygun sayfaya yönlendir
      return <Navigate to="/operations" replace />;
    }
  }

  // Yetkili -> içeriği göster
  return children;
}
