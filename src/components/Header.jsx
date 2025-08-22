<<<<<<< HEAD
// frontend/src/components/Header.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import "./Header.css";
import RoleMenu from "./RoleMenu.jsx"; // yoksa bu satırı ve kullanımını kaldır

const CANON_MAP = {
  "Operasyon Müdürü": "OPERASYON_MUDURU",
  "Genel Müdür": "GENEL_MUDUR",
  OPERASYON_MUDURU: "OPERASYON_MUDURU",
  GENEL_MUDUR: "GENEL_MUDUR",
};
const DISPLAY_MAP = {
  OPERASYON_MUDURU: "Operasyon Müdürü",
  GENEL_MUDUR: "Genel Müdür",
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
function readAuth() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || null;
  let role = "";
  if (token) {
    const decoded = decodeToken(token);
    role = decoded?.role || decoded?.claims?.role || "";
  }
  if (!role) role = localStorage.getItem("role") || sessionStorage.getItem("role") || "";
  return { token, role: normalizeRole(role) };
}

export default function Header() {
  const nav = useNavigate();
  const location = useLocation();
  const [auth, setAuth] = useState(readAuth());
  const isLoggedIn = !!auth.token;

  useEffect(() => {
    const onStorage = (e) => {
      if (!e || ["token", "logout", "role"].includes(e.key)) {
        setAuth(readAuth());
        if (e && e.key === "logout") nav("/login", { replace: true });
      }
    };
    const onAuthChanged = () => setAuth(readAuth());
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", onAuthChanged);
    setAuth(readAuth());
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, [nav]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.setItem("logout", Date.now().toString());
    localStorage.removeItem("logout");
    window.dispatchEvent(new Event("auth-changed"));
    nav("/login", { replace: true });
  };

  // Login sayfasında header gizli
  if (location.pathname === "/login") return null;

  return (
    <header className="header">
      <div className="header-inner">
        {/* Sol: gerçek logo + isteğe bağlı rol menüsü */}
        <div className="header-left">
          <Link to="/" className="logo-link" aria-label="Ana sayfa">
            <img src="/logo.png" alt="Logo" className="logo" />
          </Link>
          {isLoggedIn && RoleMenu ? <RoleMenu role={auth.role} /> : null}
        </div>

        {/* Sağ: rol rozeti + küçük/kibar Çıkış */}
        <div className="header-right">
          {isLoggedIn ? (
            <>
              {auth.role && (
                <span className="role-badge">{DISPLAY_MAP[auth.role] || auth.role}</span>
              )}
              {/* 🔒 Özel sınıf: logout-btn */}
              <button className="logout-btn" onClick={logout}>Çıkış</button>
            </>
          ) : (
            <>
              <span className="muted">Giriş yapılmadı</span>
              <Link to="/login" className="btn small">Giriş</Link>
            </>
          )}
        </div>
=======
import React from "react";
import "../styles/Header.css";
import logo from "../assets/logo.png"; // Logo dosyasını import et

function Header() {
  const userEmail = localStorage.getItem("userEmail");
  const userRole = localStorage.getItem("userRole");

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <header className="header">
      <div className="header-logo">
        <img src={logo} alt="Dosya Takip Sistemi" className="logo-image" />
      </div>
      <div className="header-user">
        <span>
          {userEmail} {userRole === "admin" && <b>(Admin)</b>}
        </span>
        <button onClick={handleLogout} className="header-logout-btn">
          Çıkış Yap
        </button>
>>>>>>> c94ea80cea599216dd876483343922d6b59644af
      </div>
    </header>
  );
}
<<<<<<< HEAD
=======

export default Header;
>>>>>>> c94ea80cea599216dd876483343922d6b59644af
