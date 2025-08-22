import { useEffect, useMemo, useState } from "react";
import "./AppShell.css";

export default function AppShell({ title = "BUTCE v3", subtitle, right, children }) {
  const mode = import.meta.env.MODE?.toUpperCase?.() || "DEV";
  const [theme, setTheme] = useState(() => {
    // Varsayılan: OS tercih; localStorage varsa onu kullan
    const saved = localStorage.getItem("butce_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("butce_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const EnvBadge = useMemo(() => {
    const cls = mode === "PROD" ? "env-badge prod" : mode === "STAGING" ? "env-badge staging" : "env-badge dev";
    return <span className={cls}>{mode}</span>;
  }, [mode]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" role="img">
                <path
                  d="M4 12a8 8 0 1 0 8-8v8H4z"
                  fill="currentColor"
                  opacity="0.18"
                />
                <path
                  d="M12 2a10 10 0 1 1-7.07 2.93A10 10 0 0 1 12 2zm0 2a8 8 0 1 0 8 8h-8V4z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="brand-text">
              <div className="brand-title">
                {title} {EnvBadge}
              </div>
              {subtitle && <div className="brand-subtitle">{subtitle}</div>}
            </div>
          </div>

          <div className="header-actions">
            {right}
            <button className="icon-btn" onClick={toggleTheme} aria-label="Tema değiştir">
              {/* Basit tema ikonu */}
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M21.64 13a9 9 0 1 1-10.63-10.6a1 1 0 0 1 1.11 1.45a7 7 0 0 0 8.67 8.67a1 1 0 0 1 .85 1.48Z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M6.76 4.84l-1.8-1.79l1.41-1.41l1.79 1.8l-1.4 1.4ZM1 13h3v-2H1v2Zm10 10h2v-3h-2v3ZM4.96 19.78l1.41 1.41l1.79-1.8l-1.41-1.41l-1.79 1.8ZM17.24 4.84l1.41-1.41l1.79 1.8l-1.41 1.41l-1.79-1.8ZM20 13h3v-2h-3v2ZM11 1h2v3h-2V1Zm7.04 18.78l-1.8-1.8l1.41-1.41l1.8 1.8l-1.41 1.41ZM12 6a6 6 0 1 1 0 12a6 6 0 0 1 0-12Z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}
