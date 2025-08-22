// frontend/src/pages/Operations.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import anime from "animejs";
import "./Operations.css";

/** ---- Rol tespiti yardımcıları (Header ile uyumlu) ---- **/
const CANON_MAP = {
  "Operasyon Müdürü": "OPERASYON_MUDURU",
  "Genel Müdür": "GENEL_MUDUR",
  OPERASYON_MUDURU: "OPERASYON_MUDURU",
  GENEL_MUDUR: "GENEL_MUDUR",
};
function toAsciiTr(s) {
  return s
    .replace(/[ğĞ]/g, "g").replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s").replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c").replace(/[ıİ]/g, "i");
}
function normalizeRole(r) {
  if (!r) return "";
  if (CANON_MAP[r]) return CANON_MAP[r];
  let s = String(r).trim();
  s = toAsciiTr(s).replace(/\s+/g, "_").toUpperCase();
  return CANON_MAP[s] || s;
}
function decodeToken(token) {
  try {
    const payload = token.split(".")[1] || "";
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    try { return JSON.parse(decodeURIComponent(escape(json))); }
    catch { return JSON.parse(json); }
  } catch { return {}; }
}
function readRole() {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    null;

  let role = "";
  if (token) {
    const d = decodeToken(token);
    role = d?.role || d?.claims?.role || "";
  }
  if (!role) {
    role =
      localStorage.getItem("role") ||
      sessionStorage.getItem("role") ||
      "";
  }
  return normalizeRole(role);
}
/** ------------------------------------------------------- **/

export default function Operations() {
  const role = readRole();
  const isGM = role === "GENEL_MUDUR";
  const isOP = role === "OPERASYON_MUDURU";

  const cards = [
    { to: "/customers",    emoji: "📄", title: "Müşteriler",        desc: "Kayıt & yönetim" },
    { to: "/salespersons", emoji: "👥", title: "Satışçılar",        desc: "Ekip ve hedefler" },
    { to: "/transactions", emoji: "💳", title: "İşlemler",          desc: "Yatırım / Çekim" },
    // ✅ Yeni kart: Retention müşteri yatırım
    { to: "/Retention",    emoji: "🧲", title: "Retention Yatırım", desc: "RET müşterisi için yatırım" },
  ];
  if (isOP) {
    cards.push({ to: "/ret-members",    emoji: "🧑‍🤝‍🧑", title: "RET Grubu",     desc: "Üye ekle & yönet" });
  }
  if (isGM) {
    cards.push({ to: "/ret-assignment", emoji: "🗂️", title: "RET Atama",      desc: "Adaylardan atama" });
    cards.push({ to: "/ret-reports",    emoji: "📊", title: "RET Raporları",  desc: "Özet & analiz" });
    cards.push({ to: "/reports",        emoji: "📈", title: "Genel Raporlar", desc: "Performans & özet" });
  }

  useEffect(() => {
    const targets = document.querySelectorAll(".ops-card");
    if (!targets.length) return;
    try {
      anime.set(targets, { opacity: 0, translateY: 14 });
      anime({
        targets,
        opacity: [0, 1],
        translateY: [14, 0],
        delay: anime.stagger(70),
        duration: 520,
        easing: "easeOutQuad",
      });
    } catch {
      // animejs yoksa sessiz geç
    }
  }, []);

  function pressEffect(e) {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();

    let clientX = rect.left + rect.width / 2;
    let clientY = rect.top + rect.height / 2;
    if ("clientX" in e) {
      clientX = e.clientX || clientX;
      clientY = e.clientY || clientY;
    } else if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX || clientX;
      clientY = e.touches[0].clientY || clientY;
    }
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    const ripple = document.createElement("span");
    ripple.className = "ops-ripple";
    const maxSize = Math.max(rect.width, rect.height) * 1.35;
    ripple.style.left = `${cx}px`;
    ripple.style.top = `${cy}px`;
    ripple.style.width = `${maxSize}px`;
    ripple.style.height = `${maxSize}px`;
    card.appendChild(ripple);

    try {
      anime({
        targets: ripple,
        scale: [0, 1],
        opacity: [0.35, 0],
        duration: 460,
        easing: "ease-out",
        complete: () => ripple.remove(),
      });
      anime.timeline()
        .add({ targets: card, scale: [1, 0.985], duration: 110, easing: "easeOutQuad" })
        .add({ targets: card, scale: [0.985, 1], duration: 180, easing: "easeOutBack" });
    } catch {
      setTimeout(() => ripple.remove(), 500);
    }
  }

  return (
    <div className="operations-page" data-page="operations">
      <div className="ops-cards">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="ops-card link-card ops-corner"
            aria-label={c.title}
            onMouseDown={pressEffect}
            onTouchStart={pressEffect}
          >
            <div className="ops-card-body">
              <div className="ops-card-emoji">{c.emoji}</div>
              <div className="ops-card-title">{c.title}</div>
              <div className="ops-card-desc">{c.desc}</div>
            </div>

            {/* Dekoratif hafif glow balonları */}
            <span className="corner-deco tl" />
            <span className="corner-deco tr" />
            <span className="corner-deco bl" />
            <span className="corner-deco br" />
          </Link>
        ))}
      </div>
    </div>
  );
}
